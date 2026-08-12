#!/usr/bin/env bash
# main 푸시 후 Vercel 배포 완료를 기다리고 프로덕션 도메인 연결까지 확인한다.
#
# 검증 4단계 (Ready만으로는 커스텀 도메인 반영을 보장하지 못한다):
#   1) vercel ls        → 최신 배포 URL
#   2) vercel inspect   → status Ready 대기
#   3) vercel alias ls  → 프로덕션 도메인이 그 배포를 가리키는지
#   4) curl             → 실경로 응답 확인
#
# 백그라운드 폴링은 세션 종료 시 기록 없이 끊길 수 있으므로
# 반드시 포그라운드에서 실행한다.
#
# 사용: scripts/wait-for-vercel-deploy.sh [최대 시도 횟수(기본 20)] [간격초(기본 15)]

set -euo pipefail

PROJECT="viewpercent-diagnostic"
PROD_DOMAIN="diagnostic.vupercent.com"
MAX_TRIES="${1:-20}"
INTERVAL="${2:-15}"

for i in $(seq 1 "$MAX_TRIES"); do
  url=$(npx -y vercel ls "$PROJECT" 2>/dev/null | grep -m1 "^https://" || true)
  if [ -z "$url" ]; then
    echo "[$i/$MAX_TRIES] 배포 목록 조회 실패, 재시도"
    sleep "$INTERVAL"
    continue
  fi

  state=$(npx -y vercel inspect "$url" 2>&1 | grep -m1 "status" || true)
  if echo "$state" | grep -q "Ready"; then
    aliased=$(npx -y vercel alias ls 2>/dev/null | grep "$PROD_DOMAIN" | grep -c "${url#https://}" || true)
    if [ "$aliased" -ge 1 ]; then
      http=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_DOMAIN")
      echo "READY  $url"
      echo "ALIAS  $PROD_DOMAIN → 연결 확인"
      echo "CURL   https://$PROD_DOMAIN → HTTP $http"
      [ "$http" = "200" ] && exit 0
      echo "실경로 응답이 200이 아님" >&2
      exit 1
    fi
    echo "[$i/$MAX_TRIES] Ready지만 $PROD_DOMAIN 미연결, 대기"
  elif echo "$state" | grep -qi "error"; then
    echo "ERROR  $url — 배포 실패" >&2
    exit 1
  else
    echo "[$i/$MAX_TRIES] 빌드 중: ${state:-상태 미확인}"
  fi
  sleep "$INTERVAL"
done

echo "TIMEOUT — $((MAX_TRIES * INTERVAL))초 내 완료되지 않음" >&2
exit 1
