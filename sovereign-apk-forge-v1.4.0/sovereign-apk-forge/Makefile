# Sovereign APK Forge — top-level Makefile
.PHONY: toolchain test template clean help

help:
	@echo "Sovereign APK Forge targets:"
	@echo "  make toolchain  — fetch + verify build tools"
	@echo "  make test       — run build + deterministic + no-ads tests"
	@echo "  make template   — build the template app as smoke test"
	@echo "  make clean      — remove build artifacts"

toolchain:
	./scripts/fetch-toolchain.sh

test:
	./tests/test-build.sh
	./tests/test-deterministic.sh
	./tests/test-no-ads.sh

template:
	./scripts/build-apk.sh template/ dist/template-smoke

clean:
	rm -rf dist/ template/obj template/build
