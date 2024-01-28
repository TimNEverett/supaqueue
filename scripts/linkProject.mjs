import inquirer from "inquirer";
import { exec } from "child_process";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

// Function to prompt the user for the project reference and database password
async function promptForProjectDetails() {
  const questions = [
    {
      type: "input",
      name: "projectRef",
      message: "Please enter your Supabase project ref:",
      default: process.env.PROJECT_REF,
      validate: (input) => (input ? true : "Project ref cannot be empty."),
    },
    {
      type: "password",
      name: "dbPassword",
      message: "Please enter your database password:",
      default: process.env.DB_PASSWORD,
      mask: "*",
      validate: (input) =>
        input ? true : "Database password cannot be empty.",
    },
  ];
  return inquirer.prompt(questions);
}

// Function to link the Supabase project using the provided project ref and database password
function linkSupabaseProject(projectRef, dbPassword) {
  const command = `supabase link --project-ref=${projectRef} --password=${dbPassword}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error linking project: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(`Project linked successfully:\n${stdout}`);
  });
}

// Main function to run the script
async function main() {
  try {
    const answers = await promptForProjectDetails();

    linkSupabaseProject(answers.projectRef, answers.dbPassword);

    await fs.writeFile(
      ".env",
      `PROJECT_REF=${answers.projectRef}\nDB_PASSWORD=${answers.dbPassword}\n`,
      { flag: "w" }
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
