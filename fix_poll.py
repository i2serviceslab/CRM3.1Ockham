import re

with open('src/app/api/meetings/transcribe/route.ts', 'r') as f:
    api_code = f.read()

# Replace the file upload logic to include polling
old_logic = """        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
          mimeType,
          displayName: "Massive Meeting Recording",
        });
        
        const audioPart = {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri
          }
        };"""

new_logic = """        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
          mimeType,
          displayName: "Massive Meeting Recording",
        });
        
        let fileState = await fileManager.getFile(uploadResponse.file.name);
        while (fileState.state === "PROCESSING") {
          console.log('File is processing, waiting 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          fileState = await fileManager.getFile(uploadResponse.file.name);
        }
        
        if (fileState.state === "FAILED") {
          throw new Error("Gemini failed to process the uploaded audio file.");
        }
        
        const audioPart = {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri
          }
        };"""

api_code = api_code.replace(old_logic, new_logic)

with open('src/app/api/meetings/transcribe/route.ts', 'w') as f:
    f.write(api_code)

print("Polling logic added!")
