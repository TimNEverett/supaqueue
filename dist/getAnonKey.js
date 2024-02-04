import { exec } from "child_process";
import fs from "fs/promises";
// Function to get the Supabase project API keys
const getSupabaseApiKeys = async () => {
    return new Promise((resolve, reject) => {
        exec("supabase projects api-keys", (error, stdout, stderr) => {
            if (error) {
                reject(`Error retrieving API keys: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Error: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
};
// Function to parse the stdout to find the anon key
function parseAnonKey(apiKeysOutput) {
    const lines = apiKeysOutput.split("\n");
    const anonKeyLine = lines.find((line) => line.includes("anon"));
    if (!anonKeyLine) {
        throw new Error("Anon key not found in the API keys output.");
    }
    const anonKey = anonKeyLine.split("│")[1].trim();
    return anonKey;
}
// Main function to run the script
async function main() {
    try {
        const apiKeysOutput = await getSupabaseApiKeys();
        const anonKey = parseAnonKey(apiKeysOutput);
        console.log(`Anon key retrieved: ${anonKey}`);
        const sanitizedAnonKey = anonKey.replace(/\u001b\[.*?m/g, "");
        // Add to the .env file with the sanitized anon key
        await fs.writeFile(".env", `SUPABASE_ANON_KEY=${sanitizedAnonKey}\n`, {
            flag: "a",
        });
        console.log("Anon key saved to .env file.");
    }
    catch (error) {
        console.error("An error occurred:", error);
    }
}
main();
