import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
if (!projectsContainer){
    console.error("Error: .projects container is not found in the DOM.");
    return;
}

renderProjects(projects, projectsContainer, 'h2');

if (projectsTitle){
    projectsTitle.textContent = `Projects (${projects.length})`;
}
    
} catch (error){
    console.error('Error loading projects:', error);
    }
}

loadProjects();




