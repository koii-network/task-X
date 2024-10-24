const {KoiiStorageClient} = require('@_koii/storage-task-sdk');

async function testStorageClient() {
    const client = KoiiStorageClient.getInstance({debug: true});
    const blob = await client.getFile("bafybeiflp4ns64m5qtqgjvddjzgq6b7fv2l4765ta5bb3q4sd7medhhzzm", 'dataList.json');
    const text = await blob.text(); // Convert Blob to text
    const data = JSON.parse(text); // Parse text to JSON
    console.log(data);
    process.exit(0);
}

testStorageClient();