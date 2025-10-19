import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        const projectsTitle = document.querySelector('projects-title');
        
        renderProjects(projects, projectsContainer, 'h2');

        if (projectsTitle){
            projectsTitle.textContent = `${projects.length} Projects`;
        }
    } catch (error){
        console.error('There is an error associated with loading the projects:', error);
    }
}

loadProjects();





