import { nip19 } from 'nostr-tools';

// The Nostr kind 30000 event JSON
const event = {
  "id": "4302f768f75c4b121eeef3b23f397cfc41d1934caed423ff7e8e4c45971b8275",
  "pubkey": "f7922a0adb3fa4dda5eecaa62f6f7ee6159f7f55e08036686c68e08382c34788",
  "created_at": 1740931754,
  "kind": 30000,
  "tags": [
    ["d", "DeMu / V4V"],
    ["p", "bdc657e088a119aae143de4a4e442752709882f404214409dc0585f19a7fd5c2"],
    ["p", "2321831583d871b7636468f67ff78068668e6eb3c9cdbb230a6d478e9866f2ed"],
    ["p", "0c6b22fbba38f2f7916c22094253ed830b7e2683c4e215824a9be8f06f42f0e9"],
    ["p", "79438d33f6fba05b5127676e05106d4743ee10045f840b4f2b6d172162f93ad4"],
    ["p", "119a1f711aefc7d9aaf176d0dbdbe4d2d149a0c88db4b4260489a7e5f73fc8ee"],
    ["p", "616938c1428a25864191b26b3b801e0f9960df2180f22a4b40a4393c184b5eb3"],
    ["p", "ac2404cbd657eba38fd2dbf892c890581bb2c1a43ff01e903ff62f0560555073"],
    ["p", "1094b3ca6603c2cdfa45de9ce05c28b72e9ad38d65df38668b377e47f786f55c"],
    ["p", "002086dd8daaaa988cf991f80cd56dc8937ad9ea1fe4f4ae14a39e374b7dd70f"],
    ["p", "3a31fb7a0330e69922554c49ec6ce55472b08cdf6e0fa043f7b758aa19ad326b"],
    ["p", "28980baae1d1ee26690b61cb5c60b156b5ca0c1d962d2aabe6b7fee9d7b9d9cd"],
    ["p", "86c79e5aa8c41f68c9a238858b08c4d63c1b0ce6d4fa96d32a90df25bd83b072"],
    ["p", "eb882b0bb659bf72235020a0b884c4a7d817e0af3903715736b146188b1d0868"],
    ["p", "7099337805f1f54f122792c9febcae59ebbb7b5504dcb8f387ffc6bfda2a0b48"],
    ["p", "500a6aa0f6b3a97957dd7a6398965f3746909efaeafb060fc9c1ed07ca298e16"],
    ["p", "e1d6f82bf6a194a9372746728d29ea75448242c0872d0323b4bdc072c790516e"],
    ["p", "e3e11bab8bb77d0f26287ef854311adaf5830f2891e1b9d355f55345cfc4a013"],
    ["p", "01b564093b88a80fa5269f27044e1dea1d832f56f9b40f2064a6ba39506f27e2"],
    ["p", "4d4ab737e2fbb5af0fd590b4b7e8c6fe76d3a02a9791ef7fdacf601f9e50fad8"],
    ["p", "baa22dea2c8ccdb0fc0d2282f42c3f4cd3d4053fec216f470a481563635000e1"],
    ["p", "3a02709eb796e5728b326fc800610a5425a34403ebc0a9a2acd60c641690eb0e"],
    ["p", "07daf46dbfe0cf53be49c0a78628ec3915e54f328ca2adba9b03eae5cf86b248"],
    ["p", "4c33fb39860772e2426e5f5fbf38c2f015fdc94e43dba2cbb11134a3e9dc186b"],
    ["p", "eeb11961b25442b16389fe6c7ebea9adf0ac36dd596816ea7119e521b8821b9e"],
    ["p", "e41e25d69e746058b7b58d9026707a8c2740c7b9d790b1e2b1baa88e66088c06"],
    ["p", "00b50a4bd93ccf29d526f33b2c16a7f42f44462d76a48be65f56a0e5362b7867"],
    ["p", "036533caa872376946d4e4fdea4c1a0441eda38ca2d9d9417bb36006cbaabf58"],
    ["p", "85f28d3a968e7c7a224e96e7be37c1a073e0bbd734a2cc3779075293f26d2b41"],
    ["p", "a0952eb01a566ea30770f132e7f04085aad1f971045a0a95f1e70cd23958ec6d"],
    ["p", "c740c76b9270b52d8ebb052bab8c72439706b5d100ddca9d28cf7fe0d5ad736c"],
    ["p", "ee0e813924d081ef9c79af794ef5f2113b6c8051de41bad7ad403611cff01b6c"],
    ["client", "noStrudel", "31990:266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5:1686066542546"],
    ["p", "3e82be8e4e0d236d2c544905252deec70ae5f6e36dcff063af979faa63864b2d"],
    ["p", "2dfbe5cb955e4018b76e6542a3b8782144dd5f5735914db9921fd24c3b3d106d"],
    ["p", "d89d8e727c87fda13c58172f7abf270bae7bc02dd50320c33adb09b939cdbe60"],
    ["p", "e3502a1c63afae691751e917cd12bb8718146c484bba288237e864a6d24fa63e"],
    ["p", "883fea4c071fda4406d2b66be21cb1edaf45a3e058050d6201ecf1d3596bbc39"],
    ["p", "fade1651214f5f33f38609ba748b1e9b237cbe41f2e622145cf0f83d17321c66"],
    ["p", "7f2647f80d57d54eb6ddd0d992a9757a341ed49dd4074cc78fc01ddea10a1ad9"],
    ["p", "330fb1431ff9d8c250706bbcdc016d5495a3f744e047a408173e92ae7ee42dac"],
    ["p", "8620040a4982cb817c1b3263152efca56ea59b5084c962b97d0ef2f9254e2e74"],
    ["p", "fc3b4c2e907cda5f0a48da951f5090029308d5fd46729c4d9dab3e88616f298a"],
    ["p", "2d764140becb6eb77b3f09cdca40ec7477028bfce56d20c1fb7f5d13b62e3745"],
    ["p", "e49744a8127cfaccab655be0791beee2667dc30fba74a17c1f78da5557c4e09c"],
    ["p", "e4f695f05bb05b231255ccce3d471b8d79c64a65bccc014662d27f0f7e921092"],
    ["p", "a762fc0dc9efed800e00e1e64ffc84b09d8e84deedf92486070cb57b6f50af15"],
    ["p", "de8ca7a6b3f7314e91921d4dc5e915fb7bc2bd32129ea6966322effa48050c4c"],
    ["p", "13f9a964bfcc49be2e6fc20d3c270269af1534060fa4d60ffcbb8353986bd54c"],
    ["p", "2a990fbb4a97e1018e625c833e200b8b4d191c698e43c566acdf12aebb64b291"],
    ["p", "dce8fd96692443f5ad71160f3195db6e6a8565b1cda2f28f75ad9c22d6fdae43"],
    ["p", "7122bd062a05d5714010a14ed0265b4ba261fc1cbc2939f72e1eab67d4c6669e"]
  ],
  "content": "",
  "sig": "819f42963458982eb9fcefddc8184e4b9fe2a9126810bbb0133311bd3bc91991ca0dc73fcf2cd4ca4a42110914ab5b1726a3d69bd0d7491f31e7de9fe775521b"
};

console.log('Extracting hex pubkeys from p-tags and converting to npub format...\n');

// Extract all p-tag hex pubkeys
const hexPubkeys = event.tags
  .filter(tag => tag[0] === 'p' && tag[1]) // Filter for p-tags with a value
  .map(tag => tag[1]); // Extract the hex pubkey value

console.log(`Found ${hexPubkeys.length} hex pubkeys in p-tags\n`);

// Convert each hex pubkey to npub format
const npubList = [];
const lookup = {};

hexPubkeys.forEach((hexPubkey, index) => {
  try {
    const npub = nip19.npubEncode(hexPubkey);
    npubList.push(npub);
    lookup[hexPubkey] = npub;
    console.log(`${index + 1}. ${hexPubkey} -> ${npub}`);
  } catch (error) {
    console.error(`Error converting ${hexPubkey}: ${error.message}`);
  }
});

console.log('\n=== NPUB LIST FOR AUTO-TAGGING ===');
console.log(JSON.stringify(npubList, null, 2));

console.log('\n=== HEX TO NPUB LOOKUP OBJECT ===');
console.log(JSON.stringify(lookup, null, 2));

console.log(`\n=== SUMMARY ===`);
console.log(`Total hex pubkeys found: ${hexPubkeys.length}`);
console.log(`Successfully converted to npub: ${npubList.length}`);
console.log(`Conversion errors: ${hexPubkeys.length - npubList.length}`);