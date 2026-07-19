! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SecretsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SecretsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SecretsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SecretsTestCase - regressions for commit 3a8f2e9
!   (session-local CSPRNG; secrets backed by HostRandom, distinct from random)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SecretsTestCase removeAllMethods: 0.
SecretsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Session-Local State'
method: SecretsTestCase
testGeneratorIsSessionLocalNotCommitted
	"Regression for commit 3a8f2e9: the secrets CSPRNG must live in SessionTemps,
	NOT in the committed module singleton.  The old code did `self at: #_generator
	put:`, so any session that used secrets and then committed application data
	dragged the generator into the repository.  Assert that after using secrets the
	generator is absent from the module's persistent slots and held in SessionTemps."

	| s |
	s := secrets ___instance___.
	s @env1:token_bytes: 8.
	"Not parked on the committed module singleton..."
	self assert: (s at: #_generator ifAbsent: [#GrailAbsent]) == #GrailAbsent.
	"...held in this session's SessionTemps instead."
	self assert: (SessionTemps current includesKey: #'___GrailSecretsGenerator___').
%

category: 'Grail-Tests - Session-Local State'
method: SecretsTestCase
testGeneratorIsHostRandomCsprng
	"Regression for commit 3a8f2e9: secrets must be backed by HostRandom — the OS
	CSPRNG, matching CPython's secrets (os.urandom) — not the seedable Mersenne-
	Twister-style Random PRNG that backs the random module."

	| s gen |
	s := secrets ___instance___.
	s @env1:token_bytes: 8.
	gen := SessionTemps current at: #'___GrailSecretsGenerator___' ifAbsent: [nil].
	self assert: gen class == HostRandom.
%

category: 'Grail-Tests - Session-Local State'
method: SecretsTestCase
testIndependentOfRandomSeed
	"secrets is a CSPRNG, not the seedable random PRNG: fixing random's seed must
	NOT make secrets reproducible (random.seed reproducibility is RandomTestCase's
	job).  Distinguishes the two generators after commit 3a8f2e9 split them."

	| s t1 t2 |
	s := secrets ___instance___.
	random ___instance___ @env1:seed: 42.
	t1 := s @env1:token_bytes: 16.
	random ___instance___ @env1:seed: 42.
	t2 := s @env1:token_bytes: 16.
	self deny: t1 = t2.
%

set compile_env: 0
