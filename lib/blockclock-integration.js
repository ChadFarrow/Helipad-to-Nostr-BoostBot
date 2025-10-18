// BlockClock Mini Integration for Helipad BoostBot
// Sends boost notifications to BlockClock Mini display

import http from 'http';
import https from 'https';

class BlockClockController {
    constructor(ip = '192.168.0.182', port = 80, options = {}) {
        this.ip = ip;
        this.port = port;
        this.baseUrl = `http://${ip}:${port}`;
        
        // Configuration options
        this.config = {
            displayMode: options.displayMode || 'amount-only', // 'sequence', 'amount-only', 'smart'
            enableScrolling: options.enableScrolling !== false, // true by default
            respectRateLimit: options.respectRateLimit !== false, // true by default
            scrollSpeed: options.scrollSpeed || 2000, // ms between scroll frames
            sequenceDelay: options.sequenceDelay || 65000, // ms between sequence items
            quickMode: options.quickMode !== false, // true by default - shows best single display
            ...options
        };
    }

    async sendRequest(path, timeout = 10000) {
        return new Promise((resolve) => {
            const url = `${this.baseUrl}${path}`;
            console.log(`📡 BlockClock request: ${url}`);
            
            const request = http.get(url, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        // Try to parse as JSON
                        const jsonData = JSON.parse(data);
                        
                        if (response.statusCode === 200) {
                            if (jsonData.error) {
                                resolve({ 
                                    success: false, 
                                    data, 
                                    statusCode: response.statusCode,
                                    rateLimited: true,
                                    waitTime: this.extractWaitTime(jsonData.error)
                                });
                            } else {
                                resolve({ success: true, data, statusCode: response.statusCode, json: jsonData });
                            }
                        } else {
                            resolve({ success: false, data, statusCode: response.statusCode, json: jsonData });
                        }
                    } catch (parseError) {
                        // Not JSON, treat as success if 200
                        resolve({ 
                            success: response.statusCode === 200, 
                            data, 
                            statusCode: response.statusCode 
                        });
                    }
                });
            });
            
            request.on('error', (error) => {
                console.log(`❌ BlockClock error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });
            
            request.setTimeout(timeout, () => {
                request.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });
        });
    }

    extractWaitTime(errorMessage) {
        // Extract wait time from "Please wait X.X seconds"
        const match = errorMessage.match(/(\d+\.?\d*)\s+seconds/);
        return match ? parseFloat(match[1]) : 60;
    }

    async sendMessage(message, options = {}) {
        // Check if message is already formatted (contains leading/trailing spaces for alignment)
        const isPreFormatted = String(message).length === 7 && (message.startsWith(' ') || message.endsWith(' '));
        
        let finalMessage;
        if (isPreFormatted) {
            // Don't modify pre-formatted messages (like right-aligned numbers)
            finalMessage = String(message);
            console.log(`📤 Sending pre-formatted to BlockClock: "${finalMessage}"`);
        } else {
            // Clean and center unformatted messages
            let cleanMessage = String(message || '');
            cleanMessage = cleanMessage
                .replace(/[^\w\s]/g, '') // Only letters, numbers, and spaces
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim()
                .toUpperCase()
                .substring(0, 7);
            
            finalMessage = this.centerText(cleanMessage);
            console.log(`📤 Sending to BlockClock: "${message}" → "${finalMessage}"`);
        }
        
        // Handle spaces properly for URL - BlockClock expects raw spaces, not %20
        const endpoint = `/api/show/text/${finalMessage}`;
        
        const result = await this.sendRequest(endpoint);
        
        if (result.success) {
            console.log(`✅ BlockClock updated successfully`);
        } else if (result.rateLimited) {
            console.log(`⏳ Rate limited, need to wait ${result.waitTime} seconds`);
        } else {
            console.log(`❌ Failed to update BlockClock:`, result.data);
        }
        
        return result;
    }

    // Center text on the 7-character display
    centerText(text, totalWidth = 7) {
        if (!text) return ' '.repeat(totalWidth);
        
        // Ensure text fits
        if (text.length >= totalWidth) {
            return text.substring(0, totalWidth);
        }
        
        // Calculate padding
        const padding = totalWidth - text.length;
        const leftPadding = Math.floor(padding / 2);
        const rightPadding = padding - leftPadding;
        
        return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
    }

    async sendNumber(number, options = {}) {
        const endpoint = `/api/show/number/${number}`;
        console.log(`📤 Sending number to BlockClock: ${number}`);
        
        const result = await this.sendRequest(endpoint);
        
        if (result.success) {
            console.log(`✅ BlockClock updated with number`);
        } else if (result.rateLimited) {
            console.log(`⏳ Rate limited, need to wait ${result.waitTime} seconds`);
        } else {
            console.log(`❌ Failed to update BlockClock:`, result.data);
        }
        
        return result;
    }

    async getStatus() {
        const result = await this.sendRequest('/api/status');
        if (result.success) {
            console.log(`📊 BlockClock status: showing "${result.json?.rendered?.string || 'unknown'}", version ${result.json?.version}`);
        }
        return result;
    }

    // Format different types of messages for BlockClock display
    formatBoostAmount(amount) {
        if (!amount) return 'BOOST';
        
        if (amount >= 1000000) {
            return `${Math.floor(amount / 1000000)}M`; // 1M, 2M, etc.
        } else if (amount >= 1000) {
            return `${Math.floor(amount / 1000)}K`; // 1K, 21K, etc.
        } else {
            return `${amount}`;
        }
    }

    formatSenderName(sender) {
        if (!sender) return 'ANON';
        // Clean and truncate sender name to 7 characters
        return sender.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7).toUpperCase();
    }

    formatMessage(message) {
        if (!message) return 'BOOST';
        // Clean message for display
        const cleaned = message.replace(/[^a-zA-Z0-9\s]/g, '').toUpperCase();
        return cleaned.substring(0, 7);
    }

    // Create smart display for longer messages
    createSmartDisplay(text, maxLength = 7) {
        if (!text) return 'BOOST';
        
        const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, '').toUpperCase();
        
        if (cleaned.length <= maxLength) {
            return this.centerText(cleaned);
        }
        
        // Try common abbreviations first
        const abbreviated = this.applyAbbreviations(cleaned);
        if (abbreviated.length <= maxLength) {
            return this.centerText(abbreviated);
        }
        
        // For longer text, create strategic displays
        if (this.config.enableScrolling && !this.config.respectRateLimit) {
            // Create scrolling frames (only if rate limiting is disabled)
            return this.createScrollingFrames(cleaned, maxLength);
        } else {
            // Smart truncation - try to keep meaningful parts
            const words = cleaned.split(' ');
            
            if (words.length > 1) {
                // Try to fit as many complete words as possible
                let result = '';
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const testResult = result + (result ? ' ' : '') + word;
                    
                    if (testResult.length <= maxLength) {
                        result = testResult;
                    } else {
                        // Can't fit this word, see if we can fit part of it
                        const remainingSpace = maxLength - result.length - (result ? 1 : 0);
                        if (remainingSpace > 2 && word.length > remainingSpace) {
                            result += (result ? ' ' : '') + word.substring(0, remainingSpace);
                        }
                        break;
                    }
                }
                return this.centerText(result || words[0].substring(0, maxLength));
            } else {
                // Single long word - truncate intelligently
                if (cleaned.length > maxLength) {
                    // Try to keep beginning and end
                    if (maxLength >= 5) {
                        const start = cleaned.substring(0, Math.floor(maxLength / 2));
                        const end = cleaned.substring(cleaned.length - Math.floor(maxLength / 2));
                        return this.centerText(start + end);
                    } else {
                        return this.centerText(cleaned.substring(0, maxLength));
                    }
                }
                return this.centerText(cleaned);
            }
        }
    }
    
    // Create scrolling effect for longer messages (rate-limit aware)
    createScrollingFrames(text, frameLength = 7) {
        const frames = [];
        const paddedText = text + '   '; // Add padding
        
        // Create sliding window frames
        for (let i = 0; i <= paddedText.length - frameLength; i++) {
            frames.push(paddedText.substring(i, i + frameLength));
        }
        
        return frames.length > 0 ? frames : [text.substring(0, frameLength)];
    }

    // Choose the best single display for a boost
    chooseBestDisplay(boostData) {
        // Simple: just show the amount - let BlockClock handle the alignment
        if (boostData.amount && boostData.amount > 0) {
            // Use number endpoint - BlockClock should right-align numbers naturally
            return {
                type: 'number',
                value: boostData.amount,
                description: `amount: ${boostData.amount} sats`
            };
        }
        
        // Fallback to BOOST if no amount
        return {
            type: 'text',
            value: 'BOOST',
            description: 'boost indicator'
        };
    }

    // Right-align text on the 7-character display
    rightAlignText(text, totalWidth = 7) {
        if (!text) return ' '.repeat(totalWidth);
        
        // Ensure text fits
        if (text.length >= totalWidth) {
            return text.substring(0, totalWidth);
        }
        
        // Pad left to right-align
        const padding = totalWidth - text.length;
        return ' '.repeat(padding) + text;
    }

    // Apply common abbreviations to fit more text
    applyAbbreviations(text) {
        const abbreviations = {
            'THANK YOU': 'THANK U',
            'THANKS': 'THX',
            'AWESOME': 'AWSOME',
            'AMAZING': 'AMAZNG',
            'GREAT': 'GR8',
            'FANTASTIC': 'FANTSC',
            'WONDERFUL': 'WNDRFL',
            'EXCELLENT': 'EXCLNT',
            'PERFECT': 'PRFCT',
            'BEAUTIFUL': 'BTIFUL',
            'MESSAGE': 'MSG',
            'BECAUSE': 'BCAUSE',
            'WITHOUT': 'W OUT',
            'WITH': 'W',
            'FROM': 'FR',
            'FOR': 'FR',
            'THE': '',  // Remove articles
            'AND': '&',
            'TO': '2',
            'TOO': '2',
            'FOR': '4',
            'FOUR': '4',
            'YOU': 'U',
            'YOUR': 'UR',
            'ARE': 'R',
            'BE': 'B',
            'SEE': 'C',
            'NIGHT': 'NITE',
            'LIGHT': 'LITE',
            'RIGHT': 'RITE'
        };
        
        let result = text;
        
        // Apply abbreviations
        for (const [full, abbrev] of Object.entries(abbreviations)) {
            result = result.replace(new RegExp(`\\b${full}\\b`, 'g'), abbrev);
        }
        
        // Remove extra spaces
        result = result.replace(/\s+/g, ' ').trim();
        
        return result;
    }

    formatPodcastName(podcast) {
        if (!podcast) return 'SHOW';
        // Clean and truncate podcast name to 7 characters
        return podcast.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 7).toUpperCase();
    }

    // Send boost notification sequence to BlockClock
    async announceBoost(boostData) {
        try {
            console.log('📺 Sending boost to BlockClock Mini...', {
                amount: boostData.amount,
                sender: boostData.sender,
                message: boostData.message,
                podcast: boostData.podcast,
                mode: this.config.displayMode
            });
            
            if (this.config.displayMode === 'smart' || this.config.displayMode === 'amount-only' || this.config.quickMode) {
                // Smart mode: show the best single display
                const bestDisplay = this.chooseBestDisplay(boostData);
                console.log(`🧠 Smart display choice: ${bestDisplay.description}`);
                
                let result;
                if (bestDisplay.type === 'number') {
                    result = await this.sendNumber(bestDisplay.value);
                } else {
                    result = await this.sendMessage(bestDisplay.value);
                }
                
                if (result.success) {
                    console.log(`✅ BlockClock showing: ${bestDisplay.description}`);
                    return true;
                } else {
                    console.log(`❌ Failed to update BlockClock:`, result);
                    return false;
                }
            } else {
                // Full sequence mode
                const sequence = this.createDisplaySequence(boostData);
                
                console.log('🎬 BlockClock sequence plan:');
                sequence.forEach((item, index) => {
                    const delay = index === 0 ? 0 : sequence.slice(0, index).reduce((sum, prev) => 
                        sum + prev.duration + (prev.isScrollFrame ? 2000 : 62000), 0);
                    console.log(`  ${index + 1}. ${item.description} (after ${Math.floor(delay/1000)}s)`);
                });
                
                // Show the first item immediately
                if (sequence.length > 0) {
                    const firstItem = sequence[0];
                let result;
                
                if (firstItem.type === 'number') {
                    result = await this.sendNumber(firstItem.value);
                } else {
                    result = await this.sendMessage(firstItem.value);
                }
                
                if (result.success) {
                    console.log(`✅ BlockClock showing: ${firstItem.description}`);
                    
                    // Schedule remaining items in sequence
                    this.scheduleSequence(sequence.slice(1));
                    return true;
                } else if (result.rateLimited) {
                    console.log(`⏳ BlockClock rate limited, will retry sequence later`);
                    // Schedule the entire sequence for later
                    setTimeout(() => {
                        this.scheduleSequence(sequence);
                    }, (result.waitTime + 5) * 1000);
                    return true;
                } else {
                    console.log('❌ Failed to send to BlockClock:', result);
                    return false;
                }
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ BlockClock error:', error);
            return false;
        }
    }

    // Create a sequence of displays for a boost
    createDisplaySequence(boostData) {
        const sequence = [];
        
        // 1. Show amount (as number for better formatting)
        if (boostData.amount && boostData.amount > 0) {
            sequence.push({
                type: 'number',
                value: boostData.amount,
                description: `amount: ${boostData.amount} sats`,
                duration: 3000
            });
        }
        
        // 2. Show sender name
        if (boostData.sender) {
            const senderName = this.formatSenderName(boostData.sender);
            sequence.push({
                type: 'text',
                value: senderName,
                description: `sender: ${boostData.sender}`,
                duration: 3000
            });
        }
        
        // 3. Show message (with smart display handling)
        if (boostData.message && boostData.message.length > 3) {
            const messageDisplay = this.createSmartDisplay(boostData.message);
            
            if (Array.isArray(messageDisplay)) {
                // Scrolling frames
                messageDisplay.forEach((frame, index) => {
                    sequence.push({
                        type: 'text',
                        value: frame,
                        description: `message frame ${index + 1}/${messageDisplay.length}: "${frame}"`,
                        duration: 2000,
                        isScrollFrame: true
                    });
                });
            } else {
                // Single optimized display
                sequence.push({
                    type: 'text',
                    value: messageDisplay,
                    description: `message: ${boostData.message} → "${messageDisplay}"`,
                    duration: 4000
                });
            }
        }
        
        // 4. Show podcast name (if available and no message shown)
        else if (boostData.podcast) {
            const podcastName = this.formatPodcastName(boostData.podcast);
            sequence.push({
                type: 'text',
                value: podcastName,
                description: `podcast: ${boostData.podcast}`,
                duration: 3000
            });
        }
        
        // 5. End with "BOOST" text
        sequence.push({
            type: 'text',
            value: 'BOOST',
            description: 'boost indicator',
            duration: 2000
        });
        
        return sequence;
    }

    // Schedule a sequence of displays with appropriate delays
    scheduleSequence(sequence) {
        if (sequence.length === 0) return;
        
        let delay = 0;
        
        sequence.forEach((item, index) => {
            setTimeout(async () => {
                try {
                    let result;
                    if (item.type === 'number') {
                        result = await this.sendNumber(item.value);
                    } else {
                        result = await this.sendMessage(item.value);
                    }
                    
                    if (result.success) {
                        console.log(`📺 BlockClock sequence ${index + 1}/${sequence.length}: ${item.description}`);
                    } else if (result.rateLimited) {
                        console.log(`⏳ Sequence item ${index + 1} rate limited`);
                    } else {
                        console.log(`❌ Sequence item ${index + 1} failed`);
                    }
                } catch (error) {
                    console.log(`❌ Error in sequence item ${index + 1}:`, error.message);
                }
            }, delay);
            
            // Shorter delays for scroll frames, normal delays for regular items
            if (item.isScrollFrame) {
                delay += item.duration + 2000; // Only 2 seconds between scroll frames
            } else {
                delay += item.duration + 62000; // 60+ seconds for regular API rate limit
            }
        });
        
        console.log(`📅 Scheduled ${sequence.length} displays over ${Math.floor(delay / 1000)} seconds`);
    }

    // Test connection and capabilities
    async testConnection() {
        console.log(`🔍 Testing BlockClock Mini at ${this.ip}:${this.port}`);
        
        // Test basic connectivity
        const pingResult = await this.sendRequest('/');
        console.log('Basic connectivity:', pingResult.success ? '✅' : '❌');
        
        // Test status endpoint
        const statusResult = await this.getStatus();
        console.log('Status endpoint:', statusResult.success ? '✅' : '❌');
        if (statusResult.success) {
            console.log('Status data:', statusResult.data);
        }
        
        // Test message sending
        const messageResult = await this.sendMessage('TEST');
        console.log('Message sending:', messageResult.success ? '✅' : '❌');
        
        return {
            connectivity: pingResult.success,
            status: statusResult.success,
            messaging: messageResult.success,
            details: { pingResult, statusResult, messageResult }
        };
    }
}

export default BlockClockController;