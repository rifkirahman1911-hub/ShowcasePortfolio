// main.js
import supabase from './supabaseClient.js';

const ok = (payload = {}) => ({ success: true, ...payload });
const fail = (msg) => ({ success: false, error: msg || 'unknown' });

// -------------------- AUTH & PROFILE HELPERS -------------------- //
export async function register(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) return fail(error.message);

    let userId = data?.user?.id ?? null;

    if (!userId) {
      const resp = await supabase.auth.getUser();
      userId = resp?.data?.user?.id ?? null;
    }

    if (!userId) return ok({ userId: null, message: 'verify_email' });

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, email, full_name: fullName, created_at: new Date() }, { onConflict: 'id' });

    if (upsertErr) return fail(upsertErr.message);

    localStorage.setItem('userId', userId);
    return ok({ userId });
  } catch (err) {
    return fail(err.message);
  }
}

export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message);
    localStorage.setItem('userId', data.user.id);
    return ok({ user: data.user });
  } catch (err) {
    return fail(err.message);
  }
}

export async function uploadProfilePicture(userId, file) {
  if (!userId || !file) return fail('userId & file required');
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${userId}/profile_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('profile_pictures').upload(path, file, { upsert: true });
    if (uploadError) return fail(uploadError.message);

    const { data } = supabase.storage.from('profile_pictures').getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const { error: updateErr } = await supabase.from('profiles').update({ profile_picture: publicUrl, updated_at: new Date() }).eq('id', userId);
    if (updateErr) return fail(updateErr.message);
    return ok({ publicUrl });
  } catch (err) { return fail(err.message); }
}

export async function updateEducation(userId, { university, major, semester, interest, bio }) {
  if (!userId) return fail('userId required');
  try {
    const { error } = await supabase.from('profiles').update({
      university, major, semester: semester ? Number(semester) : null, interest, bio, updated_at: new Date()
    }).eq('id', userId);
    if (error) return fail(error.message);
    return ok();
  } catch (err) { return fail(err.message); }
}

export async function updateSkills(userId, { hard_skills, soft_skills }) {
  if (!userId) return fail('userId required');
  try {
    const { error } = await supabase.from('profiles').update({ hard_skills, soft_skills, updated_at: new Date() }).eq('id', userId);
    if (error) return fail(error.message);
    return ok();
  } catch (err) { return fail(err.message); }
}

export async function getProfile(userId = null) {
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id;
    if (!userId) return fail('not_authenticated');
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return fail(error.message);
  return ok({ profile: data });
}

// -------------------- DOM HELPERS -------------------- //
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}
function $(selector) { return document.querySelector(selector); }
function makeTag(t) {
  const d = document.createElement("div");
  d.className = "tag";
  d.textContent = t;
  return d;
}
function parseSkillsField(f) {
  if (!f) return [];
  if (Array.isArray(f)) return f;
  return f.split(",").map(s => s.trim()).filter(Boolean);
}

// -------------------- DASHBOARD LOGIC -------------------- //
document.addEventListener("DOMContentLoaded", async ()=>{
  // Cek apakah halaman ini dashboard
  const isDashboard = !!document.getElementById('page-home-btn');
  if (!isDashboard) return; // jika bukan dashboard, skip semua dashboard code

  // session check dashboard-only
  const session = await getSessionSafe();
  if (!session){
    console.log("No session detected — redirecting to login");
    window.location.href = "/index.html";
    return;
  }
  console.log("Session active — loading dashboard:", session.user.email);
  loadProfile(session.user.id);

  // Navigation buttons
  const pageHomeBtn = $('#page-home-btn');
  const pageSkillBtn = $('#page-skill-btn');
  const pageShowcaseBtn = $('#page-showcase-btn');
  const pageHome = $('#page-home');
  const pageSkill = $('#page-skill');
  const pageShowcase = $('#page-showcase');

  function showPage(x){
    pageHome.style.display = x=='home'?'block':'none';
    pageSkill.style.display = x=='skill'?'block':'none';
    pageShowcase.style.display = x=='showcase'?'block':'none';
  
    pageHomeBtn.classList.toggle('active', x=='home');
    pageSkillBtn.classList.toggle('active', x=='skill');
    pageShowcaseBtn.classList.toggle('active', x=='showcase');
  }

  if (pageHomeBtn) pageHomeBtn.onclick = ()=>showPage('home');
  if (pageSkillBtn) pageSkillBtn.onclick = ()=>showPage('skill');
  if (pageShowcaseBtn) pageShowcaseBtn.onclick = ()=>showPage('showcase');

  // Logout button
  const btnLogout = $('#btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', async ()=>{
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });
});

// -------------------- LISTENER AUTH STATE -------------------- //
supabase.auth.onAuthStateChange((event, session)=>{
  // Hanya berlaku jika ada halaman dashboard
  const isDashboard = !!document.getElementById('page-home-btn');
  if (!isDashboard) return;
  if (!session){
    console.log("Session expired / logged out — redirecting to login");
    window.location.href = "/index.html";
  }
});

// -------------------- SAFE SESSION HELPER -------------------- //
async function getSessionSafe(){
  await new Promise(r => setTimeout(r, 50));
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// -------------------- DASHBOARD PROFILE RENDER -------------------- //
const avatarImg = $('#avatar-img');
const profileName = $('#profile-name');
const profileRole = $('#profile-role');
const profileBio = $('#profile-bio');
const greetName = $('#greet-name');
const rightBio = $('#right-bio');
const rightSkills = $('#right-skills');
const techSkills = $('#tech-skills');
const designSkills = $('#design-skills');
const softSkills = $('#soft-skills');
const activityList = $('#activity-list');
const progressBar = $('#progress-bar');
const profilePercent = $('#profile-percent');
const homeIntro = $('#home-intro');

async function loadProfile(uid){
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (error){ console.error(error); return }
  renderProfile(data);
}

function renderProfile(p){
  const fullName = p.full_name || "Tanpa Nama";
  profileName.textContent = fullName;
  greetName.textContent = fullName.split(" ")[0];
  profileRole.textContent = p.university? `${p.university} • ${p.major||""}` : "";
  profileBio.textContent = p.bio || "Belum menambahkan bio";
  rightBio.textContent = p.bio || "Belum menambahkan bio";
  homeIntro.textContent = `Halo ${fullName.split(" ")[0]}, selamat datang di dashboardmu.`;

  // Profile picture
  let avatarSrc = "";
  if (p.profile_picture){
    if (p.profile_picture.startsWith("http")) avatarSrc = p.profile_picture;
    else avatarSrc = supabase.storage.from('profile_pictures').getPublicUrl(p.profile_picture).data.publicUrl;
  }
  avatarImg.src = avatarSrc || "assets/default-profile.png";

  // Skills
  const hard = parseSkillsField(p.hard_skills);
  const soft = parseSkillsField(p.soft_skills);
  techSkills.innerHTML = "";
  designSkills.innerHTML = "";
  softSkills.innerHTML = "";
  rightSkills.innerHTML = "";
  const designKeywords = ["ui","ux","figma","wireframe","prototype"];
  const tech = [];
  const design = [];
  hard.forEach(s=>{
    if (designKeywords.some(k=>s.toLowerCase().includes(k))) design.push(s);
    else tech.push(s);
  });
  tech.forEach(s=>techSkills.appendChild(makeTag(s)));
  design.forEach(s=>designSkills.appendChild(makeTag(s)));
  soft.forEach(s=>softSkills.appendChild(makeTag(s)));
  [...hard,...soft].slice(0,6).forEach(s=>rightSkills.appendChild(makeTag(s)));

  // Recent activity
  activityList.innerHTML = "";
  const acts = p.recent_activity || [{ text:"Profil dibuat", when:"Baru saja" }];
  acts.forEach(a=>{
    const li = document.createElement("li");
    li.textContent = `${a.text} — ${a.when}`;
    activityList.appendChild(li);
  });

  // Progress
  let done = 0;
  if (p.profile_picture) done+=25;
  if (p.full_name) done+=25;
  if (hard.length || soft.length) done+=25;
  if (p.showcase_items?.length) done+=25;
  progressBar.style.width = `${done}%`;
  profilePercent.textContent = `${done}% Selesai`;
}