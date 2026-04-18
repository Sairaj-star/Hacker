# Hacker Habit Tracker

A modern, fully client-side Habit Tracker website built with only **HTML, CSS, and JavaScript**.

## Features

- Add habits with custom category, weekly goal, and accent color
- Mark daily completion with weekly visual tracker
- Current streak and longest streak tracking
- Weekly progress against each habit's target days
- Completion percentage per habit + overall dashboard stats
- Search, filter (all/pending/completed today), and sort habits
- Edit and delete individual habits
- Dark/light theme toggle
- Local storage persistence (no API, no database)
- Export and import backup JSON files
- Responsive design for desktop and mobile

## Run Locally

Open `index.html` directly in your browser.

## Deploy on GitHub Pages

1. Create a new repository on GitHub.
2. Push this project to your repository:
   - `git init`
   - `git add .`
   - `git commit -m "Initial habit tracker website"`
   - `git branch -M main`
   - `git remote add origin https://github.com/<your-username>/<repo-name>.git`
   - `git push -u origin main`
3. In GitHub repo settings, open **Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: `main` and folder `/ (root)`
5. Save and wait for deployment.

Your site will be available at:
`https://<your-username>.github.io/<repo-name>/`
