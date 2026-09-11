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
___cEnvAcceptsSize___: n name: aName
	"Does gemEnvironmentVariable:put: take a value of n characters here?"

	| s |
	s := String new: n.
	1 to: n do: [:i | s at: i put: $a].
	^ [System gemEnvironmentVariable: aName put: s. true]
		on: Error
		do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: false]
%

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
___cEnvLimitOrNil___
	"The largest value THIS platform's C environment accepts, by binary
	search; nil when nothing up to the bound is refused.

	Probed rather than hardcoded because the cap is platform-specific and a
	constant was already wrong once: 1023 held on Darwin arm64 and CI failed
	on Linux x86_64, which accepts 1024."

	| name bound lo hi mid |
	name := 'GRAIL_ELV_LIMIT_PROBE'.
	bound := 65536.
	(self ___cEnvAcceptsSize___: bound name: name) ifTrue: [^ nil].
	(self ___cEnvAcceptsSize___: 1 name: name) ifFalse: [^ 0].
	lo := 1.
	hi := bound.
	"invariant: lo is accepted, hi is refused"
	[hi - lo > 1] whileTrue: [
		mid := (lo + hi) // 2.
		(self ___cEnvAcceptsSize___: mid name: name)
			ifTrue: [lo := mid]
			ifFalse: [hi := mid]].
	^ lo
%

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
testTheCEnvironmentLimitIsWhatTheOverlayWorksAround
	"THE LOAD-BEARING CONTROL for the overlay.

	A test of the workaround alone would still pass if the limit went away,
	leaving us carrying a mechanism that buys nothing -- so pin the limit
	itself, from the other side.

	The cap is PLATFORM-SPECIFIC, so this measures it rather than asserting a
	number.  An earlier version hardcoded Darwin arm64's 1023 and CI failed on
	Linux x86_64, which accepts 1024; that is exactly the staleness this shape
	avoids, and it is why os_Environ tries the write instead of testing a
	length.

	If NO cap is found the overlay is simply inert on this platform, which is a
	fine state of the world -- reported, not failed."

	| limit name tooLong raised |
	name := 'GRAIL_ELV_LIMIT_PROBE'.
	limit := self ___cEnvLimitOrNil___.
	limit isNil ifTrue: [
		"Nothing up to 64KB refused: os_Environ's fallback never fires here."
		os_Environ ___envRawRemove___: name.
		^ self assert: true].

	self assert: limit > 0
		description: 'a C environment that refuses even one character is not '
			, 'something this overlay can paper over'.

	"Just past the measured limit the raw primitive must refuse, and refuse
	 with OutOfRange specifically -- that is the error os_Environ absorbs."
	tooLong := String new: limit + 1.
	1 to: limit + 1 do: [:i | tooLong at: i put: $a].
	raised := [System gemEnvironmentVariable: name put: tooLong. nil]
		on: Error
		do: [:ex |
			(ex isKindOf: AlmostOutOfStackError) ifTrue: [ex pass].
			ex return: ex].
	self deny: raised isNil
		description: 'the binary search says ' , limit printString
			, ' is the limit, but ' , (limit + 1) printString , ' was accepted'.
	self assert: (raised isKindOf: OutOfRange)
		description: 'expected OutOfRange (the error os_Environ absorbs), got '
			, raised class name , ' (' , raised number printString , ')'.

	"And the whole point: os.environ round-trips that value anyway."
	os_Environ ___envRawPut___: name value: tooLong.
	self assert: (os_Environ ___envRawGet___: name) = tooLong
		description: 'a value past the platform limit must still round-trip'.
	os_Environ ___envRawRemove___: name
%

category: 'Grail-Tests - os.environ'
method: EnvLongValueTestCase
testShortValuesStillReachTheCEnvironment
	"THE OTHER PATH.  A value that fits must go to the REAL environment, not
	be swallowed by the overlay -- otherwise the overlay quietly becomes the
	only store and a child process inheriting the gem's environment stops
	seeing anything at all.

	Also pins the ordering trap: write long, then short, and the long value
	must not come back."

	| name limit long |
	name := 'GRAIL_ELV_PATHS_PROBE'.

	"Short: lands in the C environment, readable without consulting the overlay."
	os_Environ ___envRawPut___: name value: 'short value'.
	self assert: (System gemEnvironmentVariable: name) = 'short value'
		description: 'a short value must reach the real environment'.
	self deny: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a short value must NOT be parked in the overlay'.

	limit := self ___cEnvLimitOrNil___.
	limit isNil ifTrue: [
		"No cap here, so there is no long-value path to exercise."
		os_Environ ___envRawRemove___: name.
		^ self assert: true].

	"Past the platform's limit: the overlay takes it, in full."
	long := String new: limit + 1000.
	1 to: limit + 1000 do: [:i | long at: i put: $b].
	os_Environ ___envRawPut___: name value: long.
	self assert: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a value past the limit must be held in the overlay'.
	self assert: (os_Environ ___envRawGet___: name) = long
		description: 'the read path must answer the full value'.
	"parenthesised deliberately: Smalltalk binaries go left to right, so
	 `size = limit + 1000' would read as `(size = limit) + 1000'"
	self assert: (os_Environ ___envRawGet___: name) size = (limit + 1000)
		description: 'the value must round-trip at full length, never truncated'.

	"Short again: the stale overlay entry must go, or the long value wins forever."
	os_Environ ___envRawPut___: name value: 'short again'.
	self assert: (os_Environ ___envRawGet___: name) = 'short again'
		description: 'a short write must supersede the overlay entry'.
	self deny: (os_Environ ___envOverlay___ includesKey: name)
		description: 'a short write must drop the stale overlay entry'.

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
