import supabase from './supabaseClient.js';
import {
  checkLogin, logout, getProfile, updateProfile,
  addProject, getProjects, deleteProject,
  addCertificate, getCertificates, deleteCertificate,
  addAssessment, getAssessments, deleteAssessment,
  createPortfolioLink, generateCV
} from './main.js';

(async ()=>{

  const sess = await checkLogin();
  if(!sess.loggedIn){
    alert('Silakan login terlebih dahulu');
    window.location.href = 'index.html';
    return;
  }

  // --- UI ELEMENTS ---
  const logoutBtn = document.getElementById('logoutBtn');
  const profileArea = document.getElementById('profileArea');
  const saveQuickProfile = document.getElementById('saveQuickProfile');
  const refreshBtn = document.getElementById('refreshBtn');
  const createShareBtn = document.getElementById('createShareBtn');
  const generateCv = document.getElementById('generateCv');
  const projectsList = document.getElementById('projectsList');
  const certsList = document.getElementById('certsList');
  const assessList = document.getElementById('assessList');

  const quick_name = document.getElementById('quick_name');
  const quick_phone = document.getElementById('quick_phone');
  const quick_bio = document.getElementById('quick_bio');
  const quick_skills = document.getElementById('quick_skills');
  const quick_interests = document.getElementById('quick_interests');

  const proj_title = document.getElementById('proj_title');
  const proj_type = document.getElementById('proj_type');
  const proj_demo = document.getElementById('proj_demo');
  const proj_desc = document.getElementById('proj_desc');
  const addProjBtn = document.getElementById('addProjBtn');
  const clearProjBtn = document.getElementById('clearProjBtn');

  const cert_name = document.getElementById('cert_name');
  const cert_issuer = document.getElementById('cert_issuer');
  const cert_date = document.getElementById('cert_date');
  const cert_file = document.getElementById('cert_file');
  const addCertBtn = document.getElementById('addCertBtn');

  const assess_skill = document.getElementById('assess_skill');
  const assess_score = document.getElementById('assess_score');
  const assess_eval = document.getElementById('assess_eval');
  const addAssessBtn = document.getElementById('addAssessBtn');

  // --- LOAD FUNCTIONS ---
  async function loadProfile(){
    const profile = await getProfile();
    if(!profile){ profileArea.innerText = 'Profile not found'; return; }
    profileArea.innerHTML = `
      <strong>${profile.full_name}</strong><br>
      <small>${profile.phone || ''}</small><br>
      <div>${profile.bio || ''}</div>
      <div>${(profile.skills||[]).map(s=>'<span class="chip">'+s+'</span>').join(' ')}</div>
      <div>${(profile.interests||[]).map(s=>'<span class="chip">'+s+'</span>').join(' ')}</div>
    `;
    quick_name.value = profile.full_name || '';
    quick_phone.value = profile.phone || '';
    quick_bio.value = profile.bio || '';
    quick_skills.value = (profile.skills||[]).join(', ');
    quick_interests.value = (profile.interests||[]).join(', ');
  }

  async function loadProjects(){
    const projects = await getProjects();
    projectsList.innerHTML = '';
    if(!projects.length) projectsList.innerHTML='<small>No projects yet</small>';
    projects.forEach(p=>{
      const div = document.createElement('div');
      div.className='item-card';
      div.innerHTML=`
        <div>
          <strong>${p.title}</strong> — ${p.project_type}<br>
          <small>${p.description||''}</small><br>
          ${p.demo_link?`<a href="${p.demo_link}" target="_blank">${p.demo_link}</a>`:''}
        </div>
        <button class="delete-btn">Delete</button>
      `;
      div.querySelector('button').addEventListener('click', async ()=>{
        if(confirm('Delete this project?')){ await deleteProject(p.id); await loadProjects(); }
      });
      projectsList.appendChild(div);
    });
  }

  async function loadCerts(){
    const certs = await getCertificates();
    certsList.innerHTML = '';
    if(!certs.length) certsList.innerHTML='<small>No certificates yet</small>';
    certs.forEach(c=>{
      const div = document.createElement('div');
      div.className='item-card';
      div.innerHTML=`<div><strong>${c.name}</strong> — ${c.issuer||''} ${c.issued_date?`(${c.issued_date})`:''}</div>
        <button class="delete-btn">Delete</button>`;
      div.querySelector('button').addEventListener('click', async ()=>{
        if(confirm('Delete this certificate?')){ await deleteCertificate(c.id); await loadCerts(); }
      });
      certsList.appendChild(div);
    });
  }

  async function loadAssess(){
    const assessments = await getAssessments();
    assessList.innerHTML='';
    if(!assessments.length) assessList.innerHTML='<small>No assessments yet</small>';
    assessments.forEach(a=>{
      const div = document.createElement('div');
      div.className='item-card';
      div.innerHTML=`<div>${a.skill_name} — ${a.score} <small>${a.evaluator||''}</small></div>
        <button class="delete-btn">Delete</button>`;
      div.querySelector('button').addEventListener('click', async ()=>{
        if(confirm('Delete this assessment?')){ await deleteAssessment(a.id); await loadAssess(); }
      });
      assessList.appendChild(div);
    });
  }

  // --- BUTTON EVENTS ---
  logoutBtn.addEventListener('click', async ()=>{ await logout(); window.location.href='index.html'; });

  saveQuickProfile.addEventListener('click', async ()=>{
    const skillsArr = quick_skills.value.split(',').map(s=>s.trim()).filter(Boolean);
    const interestsArr = quick_interests.value.split(',').map(s=>s.trim()).filter(Boolean);
    const r = await updateProfile(quick_name.value, quick_phone.value, quick_bio.value, skillsArr, interestsArr);
    if(!r.success) return alert('Error: '+r.error);
    await loadProfile();
    alert('Profile updated');
  });

  refreshBtn.addEventListener('click', async ()=>{
    await loadProfile(); await loadProjects(); await loadCerts(); await loadAssess();
  });

  addProjBtn.addEventListener('click', async ()=>{
    if(!proj_title.value.trim()) return alert('Project title required');
    await addProject(proj_title.value, proj_desc.value, proj_type.value, proj_demo.value);
    proj_title.value=''; proj_desc.value=''; proj_demo.value='';
    await loadProjects();
  });

  clearProjBtn.addEventListener('click', ()=>{
    proj_title.value=''; proj_desc.value=''; proj_demo.value='';
  });

  addCertBtn.addEventListener('click', async ()=>{
    if(!cert_name.value.trim()||!cert_issuer.value.trim()) return alert('Name & issuer required');
    await addCertificate(cert_name.value, cert_issuer.value, cert_date.value || null, cert_file.value||null);
    cert_name.value=''; cert_issuer.value=''; cert_date.value=''; cert_file.value='';
    await loadCerts();
  });

  addAssessBtn.addEventListener('click', async ()=>{
    if(!assess_skill.value.trim()||!assess_score.value.trim()) return alert('Skill & score required');
    await addAssessment(assess_skill.value, assess_score.value, assess_eval.value);
    assess_skill.value=''; assess_score.value=''; assess_eval.value='';
    await loadAssess();
  });

  createShareBtn.addEventListener('click', async ()=>{
    const link = await createPortfolioLink();
    document.getElementById('shareLink').innerText = link || 'Error creating link';
  });

  generateCv.addEventListener('click', async ()=>{
    await generateCV();
    alert('CV generated/downloaded');
  });

  // --- INITIAL LOAD ---
  await loadProfile(); await loadProjects(); await loadCerts(); await loadAssess();

})();
