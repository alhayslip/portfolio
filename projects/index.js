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




