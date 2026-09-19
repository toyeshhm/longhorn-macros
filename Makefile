.PHONY: lint test check e2e db-up db-env dev build
lint: ; npx eslint . && npx tsc --noEmit
db-up: ; supabase start >/dev/null
db-env: db-up ; supabase status -o env | sed -n 's/^API_URL=/VITE_SUPABASE_URL=/p; s/^ANON_KEY=/VITE_SUPABASE_ANON_KEY=/p' | tr -d '"' > .env.test
test: ; npx vitest run --coverage
check: lint test
e2e: db-env ; npx playwright test
dev: ; npx vite
build: ; npx vite build
