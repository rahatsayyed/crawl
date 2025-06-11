# Coverletter & Email Automation Sheet Setup Guide

## Prerequisites

- Clone the repository: `https://github.com/rahatsayyed/crawl/`

## Setup Steps

1. **Set up Google Cloud**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Sign in with your Google account or create a new one.
   - Click **Create Project** or select an existing project from the project dropdown.
   - Name your project (e.g., "Coverletter Automation") and click **Create**.
   - Ensure billing is enabled for the project (required for API usage; Google Cloud offers a free tier for initial use).
   - Navigate to **IAM & Admin** > **Service Accounts**.
   - Click **Create Service Account**, provide a name (e.g., "sheets-automation"), and grant it the **Editor** role for basic access.
   - Create a JSON key for the service account and download it.
   - Copy the JSON key content and set it as an environment variable in your project:
     ```
     GOOGLE_CREDENTIALS={...paste JSON credentials here...}
     ```
2. **Enable Google Sheets API**
   - In the Google Cloud Console, go to **APIs & Services** > **Library**.
   - Search for **Google Sheets API**.
   - Click **Enable** to activate the API for your project.
   - If prompted, ensure the API is linked to your project and credentials are properly configured.
3. **Deploy Project on Netlify**
   - Deploy the cloned project to Netlify to make it accessible online.
   - Sign in to [Netlify](https://www.netlify.com/), connect your GitHub account, and select the cloned repository.
   - Configure build settings (use default settings if unsure) and deploy the site.
   - Note the deployed URL provided by Netlify for use in the Google Sheet.

## Google Sheets Configuration

1. **Clone the Template**
   - Make a copy of the provided Google Sheets template to your Google Drive.
2. **Configure Sheet Columns**
   - In the copied template, populate the first row (A1 to G1) with the following values:
     - **A1**: HTML Template for Resume
       - Insert the HTML content or template used for generating resumes.
     - **B1**: Resume ID
       - The ID of the resume file stored in Google Drive.
       - **How to Fetch Resume ID**:
         1. Open the resume file in Google Drive.
         2. Copy the ID from the URL: `https://drive.google.com/file/d/{ResumeID}/view`.
     - **C1**: Default Subject
       - Specify the default email subject line for outgoing emails.
     - **D1**: Resume Link
       - Provide a publicly accessible link to the resume (e.g., FlowCV, GitHub file, or Gist).
     - **E1**: Deployed Link
       - Enter the URL of the project deployed on Netlify (from Step 3).
     - **F1**: Google Sheet ID
       - The ID of the copied Google Sheet template.
       - **How to Fetch Sheet ID**:
         1. Open the Google Sheet.
         2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/{SheetID}/edit`.
     - **G1**: Grok API Key
       - Input the API key for Grok (obtain from [xAI API](https://x.ai/api)).
   - **Add Links for Email and Cover Letter Fetching**:
     - Starting from the 3rd row in **Column B**, add links to resumes or related resources.
     - Adding these links will automatically trigger the fetching of emails and cover letters for processing.

## EmailTools Setup

1. **Initiate Trigger**
   - In the copied Google Sheet, locate the **EmailTools** menu in the toolbar.
   - Click **EmailTools** > **Initiate Trigger**.
   - This sets up an automatic trigger to fetch emails and cover letters and send emails based on the data in the sheet.
2. **EmailTools Options**
   - **Dispatch Emails from This Sheet**
     - Sends emails using data from the currently active sheet.
   - **Dispatch Emails from Across Sheets**
     - Sends emails using data from all sheets in the workbook.
   - **Add Missing Cover Letter**
     - Automatically fetches and adds a cover letter if it’s missing.
   - **Add Missing Emails**
     - Automatically fetches and adds email addresses if they’re missing.

## Notes

- Sheets with names starting with `_` (underscore) will be ignored by the automation process.
