require('dotenv').config();
const { supabase } = require('./supabaseClient');

async function testBackend() {
  console.log("Testing Supabase connectivity...");
  
  // Test connection to profiles
  const { count: profileCount, error: profileErr } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (profileErr) {
    console.error("❌ Failed to query profiles:", profileErr.message);
  } else {
    console.log(`✅ Profiles table accessible. Count: ${profileCount || 0}`);
  }

  // Test connection to communities
  const { count: communityCount, error: communityErr } = await supabase
    .from('communities')
    .select('*', { count: 'exact', head: true });
    
  if (communityErr) {
    console.error("❌ Failed to query communities:", communityErr.message);
  } else {
    console.log(`✅ Communities table accessible. Count: ${communityCount || 0}`);
  }

  // Test global search route using HTTP to verify express routing integration
  console.log("\nTesting /api/search HTTP route...");
  try {
    const res = await fetch('http://localhost:5000/api/search?q=test');
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    console.log(`✅ Search route responded successfully.`);
    console.log(`   Found: ${Object.keys(data).length} result categories.`);
  } catch (err) {
    console.error("❌ Search route failed:", err.message);
  }
}

testBackend();
