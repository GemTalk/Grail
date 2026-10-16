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
	self eval: 'import random; random.seed(42)'.
	t1 := s @env1:token_bytes: 16.
	self eval: 'import random; random.seed(42)'.
	t2 := s @env1:token_bytes: 16.
	self deny: t1 = t2.
%

set compile_env: 0

category: 'Grail-Tests - Random Ints'
method: SecretsTestCase
testRandbitsAndRandbelowPastTwoToThe32
	"randbits(k) and randbelow(n) past 2**32, which the kernel's
	integerBetween:and: refuses (``Intervals > 2**32 not yet supported'').
	numpy.random's SeedSequence() asks for randbits(128).  Each value is in
	range, and the high bits are used: over 50 draws, randbits(33) reaches
	2**32 and randbits(128) reaches 2**100 (each fails with probability
	below 2**-49)."

	self assert: (self eval: 'import secrets
ks = (1, 31, 32, 33, 64, 128, 200)
ok = all(0 <= secrets.randbits(k) < 2**k for k in ks for _ in range(20))
below = all(0 <= secrets.randbelow(2**40 + 3) < 2**40 + 3 for _ in range(50))
high33 = any(secrets.randbits(33) >= 2**32 for _ in range(50))
high128 = any(secrets.randbits(128) >= 2**100 for _ in range(50))
repr((ok, below, high33, high128, secrets.randbelow(1), secrets.randbits(0)))') equals: '(True, True, True, True, 0, 0)'
%
