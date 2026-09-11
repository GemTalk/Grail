! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EnvLongValueTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnvLongValueTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnvLongValueTestCase - os.environ values too long for the C environment
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnvLongValueTestCase removeAllMethods.
EnvLongValueTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
testTheCEnvironmentStillRejectsLongValues
	"THE LOAD-BEARING CONTROL for the overlay.

	The overlay in os.gs exists only because gemEnvironmentVariable:put: has a
	hard 1023-character limit.  A test of the workaround alone would still pass
	if the limit quietly went away, and we would keep carrying a mechanism that
	no longer buys anything -- so pin the limit itself, from the other side.

	Measured, not assumed: 1023 succeeds, 1024 raises OutOfRange (error 2061),
	signalled from GsFile class >> _setEnvVariable:value:isClient:.

	If this test ever FAILS, that is good news and an instruction: GemStone has
	raised or removed the cap, and os_Environ's overlay should be re-measured
	(___envValueLimit___) or retired -- not that anything is broken."

	| name ok tooLong raised |
	name := 'GRAIL_ELV_LIMIT_PROBE'.
	ok := String new: 1023.
	1 to: 1023 do: [:i | ok at: i put: $a].
	tooLong := String new: 1024.
	1 to: 1024 do: [:i | tooLong at: i put: $a].

	"1023 is accepted."
	self assert: ([System gemEnvironmentVariable: name put: ok. true]
		on: Error
		do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: false])
		description: 'a 1023-character value should still be accepted directly'.

	"1024 is not, and the refusal is specifically OutOfRange."
	raised := [System gemEnvironmentVariable: name put: tooLong. nil]
		on: Error
		do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: ex].
	self deny: raised isNil
		description: 'gemEnvironmentVariable:put: accepted 1024 characters -- the '
			, 'limit the os_Environ overlay works around appears to be gone; '
			, 're-measure ___envValueLimit___'.
	self assert: raised number = 2061
		description: 'expected OutOfRange (2061), got ' , raised class name , ' ('
			, raised number printString , ')'.

	"Leave nothing behind."
	os_Environ ___envRawRemove___: name
%

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
testShortValuesStillReachTheCEnvironment
	"THE OTHER PATH.  A value that fits must go to the real environment, not
	be swallowed by the overlay -- otherwise the overlay would quietly become
	the only store, and a child process inheriting the gem's environment would
	stop seeing anything at all.

	Also pins that a short write DROPS a stale overlay entry, which is the
	ordering bug this would otherwise have: write long, write short, and the
	long value must not come back."

	| name long |
	name := 'GRAIL_ELV_PATHS_PROBE'.
	long := String new: 4000.
	1 to: 4000 do: [:i | long at: i put: $b].

	"Short: lands in the C environment, readable without the overlay."
	os_Environ ___envRawPut___: name value: 'short value'.
	self assert: (System gemEnvironmentVariable: name) = 'short value'
		description: 'a short value must reach the real environment'.
	self deny: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a short value must NOT be parked in the overlay'.

	"Long: goes to the overlay, and the read path still answers it in full."
	os_Environ ___envRawPut___: name value: long.
	self assert: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a long value must be held in the overlay'.
	self assert: (os_Environ ___envRawGet___: name) = long
		description: 'the read path must answer the full long value'.
	self assert: (os_Environ ___envRawGet___: name) size = 4000
		description: 'the long value must round-trip at full length, never truncated'.

	"Short again: the stale overlay entry must go, or the long value wins forever."
	os_Environ ___envRawPut___: name value: 'short again'.
	self assert: (os_Environ ___envRawGet___: name) = 'short again'
		description: 'a short write must supersede the overlay entry'.
	self deny: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a short write must drop the stale overlay entry'.

	"Remove clears both homes."
	os_Environ ___envRawRemove___: name.
	self deny: (os_Environ ___envOverlay___ includesKey: name)
		description: 'remove must clear the overlay'
%

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
testLongEnvironmentValuesRoundTripThroughOsEnviron
	"The Python-visible contract, from the fixture.

	CPython has no length limit on an environment value -- measured on CPython
	3.14: 100,000 characters round-trip through os.environ exactly, and only an
	embedded NUL raises -- so Grail must SUCCEED here rather than raise.  The
	fixture self-verifies under CPython, so every assertion below is CPython's
	behaviour and not Grail's opinion of it.

	This is the path test.test_urllib2_localnet's setUp actually took: it writes
	os.environ back, and on a machine with a long PATH that write raised an
	UNCATCHABLE Smalltalk error (OutOfRange 2061 from a user action), costing
	that module one failure locally that CI never saw."

	| mod results bad |
	importlib @env1:modules removeKey: #'env_long_value' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/env_long_value.py')
		name: 'env_long_value'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	bad := OrderedCollection new.
	#('roundtrip_1' 'roundtrip_1023' 'roundtrip_1024' 'roundtrip_5000'
	  'roundtrip_100000'
	  'short_via_getenv' 'short_via_environ'
	  'long_via_getenv' 'long_in_contains' 'long_in_keys' 'long_in_copy'
	  'long_in_items' 'long_via_get'
	  'short_overwrites_long' 'short_overwrite_via_getenv'
	  'long_overwrites_short'
	  'delete_clears_long' 'delete_removes_from_contains'
	  'update_with_long' 'putenv_long_does_not_raise'
	  'setdefault_long' 'setdefault_long_reads' 'pop_long' 'pop_cleared'
	  'path_sized_roundtrip' 'path_restored') do: [:key |
		((results @env1:__getitem__: key) = true)
			ifFalse: [bad add: key]].
	self assert: bad isEmpty
		description: 'os.environ long-value checks failed: '
			, bad asArray printString
%
