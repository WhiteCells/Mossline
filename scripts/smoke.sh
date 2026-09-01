#!/usr/bin/env bash
# Repeatable API smoke test for a running Mossline instance.
# Usage: MOSSLINE_API_URL=http://localhost:8081 MOSSLINE_ADMIN_USER=admin \
#        MOSSLINE_ADMIN_PASSWORD='...' bash scripts/smoke.sh
set -euo pipefail

api=${MOSSLINE_API_URL:-http://localhost:8081}
username=${MOSSLINE_ADMIN_USER:?set MOSSLINE_ADMIN_USER}
password=${MOSSLINE_ADMIN_PASSWORD:?set MOSSLINE_ADMIN_PASSWORD}
suffix=${MOSSLINE_SMOKE_SUFFIX:-$(date +%s)}
response=$(mktemp /tmp/mossline-smoke-response-XXXXXX)
trap 'rm -f "$response"' EXIT

request() {
  local expected=$1 method=$2 path=$3 body=${4-} token=${5-}
  local args=(-sS -o "$response" -w '%{http_code}' -X "$method" "$api$path" -H 'Accept: application/json')
  [[ -n "$body" ]] && args+=(-H 'Content-Type: application/json' --data "$body")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  local actual
  actual=$(curl "${args[@]}")
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL %s %s: expected %s, received %s\n' "$method" "$path" "$expected" "$actual" >&2
    sed -n '1,30p' "$response" >&2
    exit 1
  fi
}

request 200 GET /healthz
request 200 POST /api/login "$(jq -nc --arg u "$username" --arg p "$password" '{username:$u,password:$p}')"
token=$(jq -r '.data.token' "$response")
request 200 GET /api/me '' "$token"
request 200 GET /api/about '' "$token"
about_content=$(jq -r '.data.content' "$response")
about_status=$(jq -r '.data.status' "$response")

request 201 POST /api/category "$(jq -nc --arg n "Smoke $suffix" --arg s "smoke-$suffix" '{name:$n,slug:$s,sort:999,activate:true}')" "$token"
category_id=$(jq -r '.data.id' "$response")
request 201 POST /api/tag "$(jq -nc --arg n "SmokeTag $suffix" --arg s "smoke-tag-$suffix" '{name:$n,slug:$s,activate:true}')" "$token"
tag_id=$(jq -r '.data.id' "$response")
request 201 POST /api/post "$(jq -nc --arg c "$category_id" --arg t "$tag_id" --arg s "smoke-post-$suffix" '{title:"Smoke test post",slug:$s,desc:"Automated API verification",category_id:$c,tag_ids:[$t],content:"# Smoke test",status:"published",content_type:"markdown"}')" "$token"
post_id=$(jq -r '.data.id' "$response")
request 200 GET "/api/post/smoke-post-$suffix"

request 201 POST /api/moment '{"content":"Smoke test moment","status":"published","visibility":"public"}' "$token"
moment_id=$(jq -r '.data.id' "$response")
request 201 POST /api/friend "$(jq -nc --arg n "Smoke Friend $suffix" --arg u "https://example.com/?smoke=$suffix" '{name:$n,uri:$u,sort:999,activate:true}')" "$token"
friend_id=$(jq -r '.data.id' "$response")
request 200 PUT /api/about '{"content":"# Mossline\n\nSmoke test completed.","status":"published"}' "$token"
request 200 GET /api/about

request 401 POST /api/tag '{"name":"Anonymous","slug":"anonymous"}'
request 422 POST /api/post '{"title":"","slug":"INVALID SLUG"}' "$token"
request 404 GET "/api/post/not-found-$suffix"

# Cleanup uses the same public REST API and preserves pre-existing site data.
request 200 DELETE "/api/post/$post_id" '' "$token"
request 200 DELETE "/api/moment/$moment_id" '' "$token"
request 200 DELETE "/api/friend/$friend_id" '' "$token"
request 200 DELETE "/api/category/$category_id" '' "$token"
request 200 DELETE "/api/tag/$tag_id" '' "$token"
request 200 PUT /api/about "$(jq -nc --arg content "$about_content" --arg status "$about_status" '{content:$content,status:$status}')" "$token"
request 200 POST /api/logout "$(jq -nc --arg token "$token" '{token:$token}')" "$token"

printf 'Mossline smoke test passed (%s)\n' "$suffix"
