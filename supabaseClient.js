// supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// GANTI HANYA JIKA PERLU (URL project mu sudah kamu berikan)
const SUPABASE_URL = "https://khexegxtpykpfqdjxvof.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZXhlZ3h0cHlrcGZxZGp4dm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjQwNjMsImV4cCI6MjA3OTA0MDA2M30.hXG4uJXCY55fFcc0ySLsapt2G3KW7WLXNV3zWoFyZEQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
