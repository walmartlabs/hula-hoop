test:
	@#lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --timeout 3000
	@#$(MAKE) rm-lib-cov

tests: test

lib-cov: rm-lib-cov
	@jscoverage lib lib-cov

rm-lib-cov:
	@rm -rf ./lib-cov/

test-cov: lib-cov
	@$(MAKE) test TEST_COV=1 REPORTER=json-cov > coverage.json
	@$(MAKE) rm-lib-cov

test-cov-html: lib-cov
	@$(MAKE) test TEST_COV=1 REPORTER=html-cov > coverage.html
	@$(MAKE) rm-lib-cov

tap: lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha -R tap > results.tap
	@$(MAKE) rm-lib-cov

unit:
	@#lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive -R xunit > results.xml --timeout 3000
	@#$(MAKE) rm-lib-cov

# Test coverage with Istanbul
ist:
	@NODE_ENV=test node_modules/.bin/istanbul cover -- node_modules/.bin/_mocha --recursive

.PHONY: test tap test-cov test-cov-html unit lib-cov rm-lib-cov ist
