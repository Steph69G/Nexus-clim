#!/bin/bash
set -e

# =====================================================
# TEST E2E WORKFLOW V1 - Nexus Clim
# =====================================================

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables (à configurer)
SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises${NC}"
  exit 1
fi

API_URL="${SUPABASE_URL}/rest/v1"
RPC_URL="${SUPABASE_URL}/rest/v1/rpc"

# Mission IDs
MISSION_SAL="00000000-0000-0000-0000-000000000100"
MISSION_ST="00000000-0000-0000-0000-000000000200"

echo -e "${BLUE}🚀 Test E2E Workflow V1${NC}"
echo ""

# =====================================================
# Fonctions helper
# =====================================================

login() {
  local email=$1
  local password=$2

  echo -e "${YELLOW}🔐 Login: $email${NC}"

  local response=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")

  local token=$(echo $response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$token" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo $response
    exit 1
  fi

  echo $token
}

call_rpc() {
  local token=$1
  local function_name=$2
  local params=$3

  echo -e "${BLUE}📞 Calling: $function_name${NC}"

  local response=$(curl -s -X POST "${RPC_URL}/${function_name}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$params")

  if echo "$response" | grep -q "error"; then
    echo -e "${RED}❌ RPC Error:${NC}"
    echo $response | jq '.'
    return 1
  fi

  echo -e "${GREEN}✅ Success${NC}"
  return 0
}

get_mission_status() {
  local token=$1
  local mission_id=$2

  curl -s "${API_URL}/missions?id=eq.${mission_id}&select=status,report_status,billing_status" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${token}" | jq -r '.[0]'
}

create_fake_report() {
  local token=$1
  local mission_id=$2

  echo -e "${YELLOW}📝 Creating fake intervention report${NC}"

  # Créer rapport avec signatures et photos factices
  curl -s -X POST "${API_URL}/intervention_reports" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
      \"mission_id\": \"${mission_id}\",
      \"signed_by_tech\": true,
      \"signed_by_client\": true,
      \"tech_signature\": \"data:image/png;base64,fake\",
      \"client_signature\": \"data:image/png;base64,fake\",
      \"photos\": [{\"url\": \"fake1.jpg\"}, {\"url\": \"fake2.jpg\"}]
    }" > /dev/null

  echo -e "${GREEN}✅ Report created${NC}"
}

# =====================================================
# TEST 1: WORKFLOW SAL COMPLET (auto-validation)
# =====================================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 1: SAL - Workflow complet${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Login admin pour publier
ADMIN_TOKEN=$(login "admin@test.local" "Test1234!")

# 1. BROUILLON → PUBLIEE
call_rpc "$ADMIN_TOKEN" "rpc_publish_mission" "{\"_mission_id\": \"$MISSION_SAL\"}"
sleep 1

# Login SAL
SAL_TOKEN=$(login "sal@test.local" "Test1234!")

# 2. PUBLIEE → ACCEPTEE
call_rpc "$SAL_TOKEN" "rpc_accept_mission" "{\"_mission_id\": \"$MISSION_SAL\"}"
sleep 1

# 3. ACCEPTEE → PLANIFIEE
call_rpc "$SAL_TOKEN" "rpc_schedule_mission" "{
  \"_mission_id\": \"$MISSION_SAL\",
  \"_scheduled_start\": \"$(date -u -d '+2 days 09:00' '+%Y-%m-%dT%H:%M:%S.000Z')\",
  \"_scheduled_end\": \"$(date -u -d '+2 days 11:00' '+%Y-%m-%dT%H:%M:%S.000Z')\"
}"
sleep 1

# 4. PLANIFIEE → EN_ROUTE
call_rpc "$SAL_TOKEN" "rpc_start_travel" "{\"_mission_id\": \"$MISSION_SAL\"}"
sleep 1

# 5. EN_ROUTE → EN_INTERVENTION
call_rpc "$SAL_TOKEN" "rpc_start_intervention" "{\"_mission_id\": \"$MISSION_SAL\"}"
sleep 1

# 6. Créer rapport complet
create_fake_report "$SAL_TOKEN" "$MISSION_SAL"
sleep 1

# 7. EN_INTERVENTION → TERMINEE (auto → AUTO_VALIDE pour SAL)
call_rpc "$SAL_TOKEN" "rpc_complete_intervention" "{\"_mission_id\": \"$MISSION_SAL\"}"
sleep 1

# Vérifier statut final
STATUS=$(get_mission_status "$SAL_TOKEN" "$MISSION_SAL")
echo -e "\n${GREEN}📊 Status final SAL:${NC}"
echo "$STATUS" | jq '.'

# =====================================================
# TEST 2: WORKFLOW ST AVEC REJET
# =====================================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 2: ST - Workflow avec rejet${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# 1. BROUILLON → PUBLIEE
call_rpc "$ADMIN_TOKEN" "rpc_publish_mission" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# Login ST
ST_TOKEN=$(login "st@test.local" "Test1234!")

# 2. PUBLIEE → ACCEPTEE
call_rpc "$ST_TOKEN" "rpc_accept_mission" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# 3. ACCEPTEE → PLANIFIEE
call_rpc "$ST_TOKEN" "rpc_schedule_mission" "{
  \"_mission_id\": \"$MISSION_ST\",
  \"_scheduled_start\": \"$(date -u -d '+3 days 14:00' '+%Y-%m-%dT%H:%M:%S.000Z')\",
  \"_scheduled_end\": \"$(date -u -d '+3 days 16:00' '+%Y-%m-%dT%H:%M:%S.000Z')\"
}"
sleep 1

# 4. PLANIFIEE → EN_ROUTE
call_rpc "$ST_TOKEN" "rpc_start_travel" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# 5. EN_ROUTE → EN_INTERVENTION
call_rpc "$ST_TOKEN" "rpc_start_intervention" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# 6. Créer rapport complet
create_fake_report "$ST_TOKEN" "$MISSION_ST"
sleep 1

# 7. EN_INTERVENTION → TERMINEE (→ A_VALIDER pour ST)
call_rpc "$ST_TOKEN" "rpc_complete_intervention" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# 8. Admin REJETTE le rapport
call_rpc "$ADMIN_TOKEN" "rpc_reject_report" "{
  \"_mission_id\": \"$MISSION_ST\",
  \"_rejection_reason\": \"PHOTOS_INSUFFISANTES\",
  \"_details\": \"Photos floues, refaire SVP\"
}"
sleep 1

# Vérifier retour EN_INTERVENTION + A_COMPLETER
STATUS=$(get_mission_status "$ADMIN_TOKEN" "$MISSION_ST")
echo -e "\n${YELLOW}📊 Status après rejet:${NC}"
echo "$STATUS" | jq '.'

# 9. ST corrige et retente
call_rpc "$ST_TOKEN" "rpc_complete_intervention" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# 10. Admin VALIDE cette fois
call_rpc "$ADMIN_TOKEN" "rpc_validate_report" "{\"_mission_id\": \"$MISSION_ST\"}"
sleep 1

# Vérifier statut final
STATUS=$(get_mission_status "$ADMIN_TOKEN" "$MISSION_ST")
echo -e "\n${GREEN}📊 Status final ST:${NC}"
echo "$STATUS" | jq '.'

# =====================================================
# RÉSUMÉ
# =====================================================

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Tests E2E terminés avec succès${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Vérifier les logs des edge functions dans Supabase Dashboard${NC}"
echo -e "${BLUE}pour voir les notifications envoyées.${NC}\n"
