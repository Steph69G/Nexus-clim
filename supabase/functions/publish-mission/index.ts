import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  mission_id: string
  ttl_minutes?: number
  include_employees?: boolean
}

// Fonction pour calculer la distance entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { mission_id, ttl_minutes = 30, include_employees = false }: RequestBody = await req.json()

    console.log(`Publication mission ${mission_id} - TTL: ${ttl_minutes}min - Employés: ${include_employees}`)

    // 1. Récupérer les détails de la mission
    const { data: mission, error: missionError } = await supabaseClient
      .from('missions')
      .select('id, type, city, lat, lng, address, title, status')
      .eq('id', mission_id)
      .single()

    if (missionError) {
      throw new Error(`Mission non trouvée: ${missionError.message}`)
    }

    console.log('Mission trouvée:', {
      id: mission.id,
      title: mission.title,
      type: mission.type,
      city: mission.city,
      status: mission.status,
      coordinates: mission.lat && mission.lng ? `${mission.lat}, ${mission.lng}` : 'Non définies'
    })

    // 2. Mettre à jour le statut de la mission vers "PUBLIÉE"
    const { error: updateError } = await supabaseClient
      .from('missions')
      .update({ status: 'PUBLIÉE' })
      .eq('id', mission_id)

    if (updateError) {
      throw new Error(`Erreur mise à jour mission: ${updateError.message}`)
    }

    // 3. Construire la requête pour les utilisateurs éligibles
    let userQuery = supabaseClient
      .from('profiles')
      .select('user_id, role, city, radius_km')

    // Filtrer par rôle (en minuscules pour profiles)
    if (include_employees) {
      userQuery = userQuery.in('role', ['st', 'sal', 'tech', 'admin'])
    } else {
      userQuery = userQuery.in('role', ['st', 'sal', 'admin'])
    }

    const { data: allUsers, error: usersError } = await userQuery

    if (usersError) {
      throw new Error(`Erreur récupération utilisateurs: ${usersError.message}`)
    }

    console.log(`${allUsers?.length || 0} utilisateurs trouvés:`, allUsers?.map(u => ({
      id: u.user_id.substring(0, 8),
      role: u.role,
      city: u.city,
      radius_km: u.radius_km
    })))

    // 4. Filtrer par compétences (type de mission)
    let eligibleUsers = allUsers || []

    if (mission.type) {
      // Récupérer les utilisateurs qui ont la compétence pour ce type de mission
      const { data: skillUsers, error: skillError } = await supabaseClient
        .from('user_skill')
        .select('user_id')
        .eq('type', mission.type)

      if (!skillError && skillUsers) {
        const skillUserIds = skillUsers.map(s => s.user_id)
        eligibleUsers = eligibleUsers.filter(user => skillUserIds.includes(user.user_id))
        console.log(`${eligibleUsers.length} utilisateurs après filtrage par compétences (${mission.type}):`,
          eligibleUsers.map(u => ({ id: u.user_id.substring(0, 8), role: u.role, city: u.city })))
      }
    }

    // 5. Pas de filtrage géographique
    // Les admins publient pour TOUS les utilisateurs éligibles
    // Le rayon d'action sera géré côté interface utilisateur (ST/SAL/TECH voient seulement leurs missions dans leur rayon)
    console.log(`Pas de filtrage géographique - tous les utilisateurs éligibles recevront l'offre`)

    // 6. Exclure les utilisateurs qui ont blacklisté cette ville
    if (mission.city) {
      const { data: blackouts, error: blackoutError } = await supabaseClient
        .from('user_city_blackout')
        .select('user_id')
        .eq('city', mission.city)

      if (!blackoutError && blackouts) {
        const blackoutUserIds = blackouts.map(b => b.user_id)
        eligibleUsers = eligibleUsers.filter(user => !blackoutUserIds.includes(user.user_id))
        console.log(`${eligibleUsers.length} utilisateurs après exclusion des blacklists pour ${mission.city}`)
      }
    }

    // 7. Créer les offres avec expiration
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + ttl_minutes)

    const offers = eligibleUsers.map(user => ({
      mission_id,
      user_id: user.user_id,
      sent_at: new Date().toISOString(),
      expired: false,
      channel: 'email'
    }))

    console.log(`Création de ${offers.length} offres`)

    if (offers.length > 0) {
      // Supprimer les anciennes offres pour cette mission
      await supabaseClient
        .from('mission_offers')
        .delete()
        .eq('mission_id', mission_id)

      // Insérer les nouvelles offres
      const { error: offersError } = await supabaseClient
        .from('mission_offers')
        .insert(offers)

      if (offersError) {
        throw new Error(`Erreur création offres: ${offersError.message}`)
      }
    }

    const result = {
      success: true,
      offers_created: offers.length,
      mission_details: {
        type: mission.type,
        city: mission.city,
        has_coordinates: !!(mission.lat && mission.lng)
      },
      targeting: {
        total_users_found: allUsers?.length || 0,
        after_skills_filter: eligibleUsers.length,
        final_eligible: offers.length,
        include_employees
      }
    }

    console.log('Résultat:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erreur publication mission:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})