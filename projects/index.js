import { fetchJSON, renderProjects, fetchGithubData } from './global.js';

async function loadHomeProjects(){
    try {
      const projects = await fetchJSON('.lib/projects.json');  
      const latestProjects = projects.slice(0, 3);
      const projectsContainer = document.querySelector('projects.');

      if(!projectsContainer){
        console.error("No .projects exist on this homepage");
        return ;
      }
      renderProjects(latestProjects, projectsContainer, 'h2');

    }catch (error) {
        console.error('There is an error with loading the home projects', error);
    }
}

loadHomeProjects();

import {fetchGitHubData} from './global.js';

const profileStats = document.querySelector('#profile-stats');

async function loadGitHubProfile(){
  try{
  const githubData = await fetchGitHubData('alhayslip');

   if (!profileStats) {
      console.error("No element found with ID #profile-stats");
      return;
    }

  profileStats.innerHTML += `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  } catch (error) {
    console.error("Error loading GitHub data:", error);
    if (profileStats) {
      profileStats.innerHTML += `<p style="color:red;">Failed to load GitHub data.</p>`;
    }
  }
}
   
loadGitHubProfile();



