! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlaskScaffoldingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlaskScaffoldingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlaskScaffoldingTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
FlaskScaffoldingTestCase removeAllMethods.
FlaskScaffoldingTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! FlaskScaffoldingTestCase
!
! Locks in four AST/codegen changes that landed during the Flask
! roadmap M2 push and lay infrastructure for the rest of the Flask
! stack.  Each test loads a focused fixture under
! `tests/python/pkg_scaffolding/` and asserts the visible behaviour.
! ===============================================================================

category: 'Grail-Helpers'
method: FlaskScaffoldingTestCase
loadFixture: fixtureName
	"Load tests/python/pkg_scaffolding/<fixtureName>.py fresh, returning
	the module instance.  Drops any prior load so the test is hermetic."

	| mods fullName |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	#( 'pkg_scaffolding' ) do: [:n |
		mods @env0:removeKey: n @env0:asSymbol ifAbsent: []].
	mods @env0:removeKey: fullName @env0:asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
		name: 'pkg_scaffolding'.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

! --- AnnAssignAst -----------------------------------------------------------

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignModuleLevel
	"`x: int = expr` at module scope binds the value, drops the
	annotation."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_int) equals: 42.
	self assert: (mod @env1:module_doubled) equals: 84.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignBareAnnotation
	"`x: int` with no value emits nothing executable — accessing
	the name yields nil (no binding ever happened)."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_bare) isNil.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignLocalInFunction
	"`local_val: int = 7` inside a function body works the same
	as a plain assignment."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:value_with_annotation) equals: 7.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignComplexAnnotation
	"`items: list = []` — the annotation evaluates a name
	(`list`) Grail recognises, then `.append(...)` mutates the
	bound value.  Confirms the body runs cleanly after the
	annotation is stripped."

	| mod result |
	mod := self loadFixture: 'annassign'.
	result := mod @env1:computed_local_annotation.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignClassAttribute
	"Class-level `class_counter: int = 100` becomes a Smalltalk
	classInstVar that Python attribute access can read."

	| mod cls |
	mod := self loadFixture: 'annassign'.
	cls := mod @env1:HasAnnotatedAttrs.
	self assert: (cls @env1:class_counter) equals: 100.
%

! --- ImportAst dotted-import-as-alias --------------------------------------

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testDottedImportAsAlias
	"`import collections.abc as cabc` binds cabc to the LEAF
	collections.abc submodule, not the top-level `collections`.
	Before the fix the alias resolved to the top package."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:LEAF_NAME) equals: 'collections.abc'.
%

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testUnaliasedDottedImport
	"`import collections.abc` (no alias) binds the TOP-LEVEL
	package `collections` — CPython statement semantics.  The
	leaf is reachable via attribute access on the top."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:TOP_NAME) equals: 'collections'.
	self assert: (mod @env1:ABC_VIA_TOP) equals: 'collections.abc'.
%

! --- ClassDefAst: Python class doesn't clobber built-ins -----------------

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testClassNameDoesNotClobberBuiltin
	"`class Symbol:` and `class Set:` are deliberately named to
	collide with GemStone built-ins.  The codegen emits
	``Object subclass: 'Symbol' inDictionary: nil`` — the `nil`
	dictionary makes the class anonymous (no SymbolList entry),
	so the built-ins are untouched and the Python class is
	reachable only through the module's instVar."

	| mod sym builtin |
	mod := self loadFixture: 'builtin_collision'.
	sym := mod @env1:Symbol.
	"The built-in Symbol class still resolves via the symbol
	list — and it's NOT the Python class."
	builtin := System myUserProfile symbolList @env0:objectNamed: #Symbol.
	self assert: builtin notNil.
	self deny: builtin == sym.
	"The Python class is the one the module instVar holds, not
	a clone of the built-in."
	self assert: sym superclass equals: PythonInstance.
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testCollidingClassConstructs
	"The anonymous Python class is fully usable: __init__ runs,
	instance attrs land in the right slots, module-level
	construction wires up correctly."

	| mod a b set |
	mod := self loadFixture: 'builtin_collision'.
	a := mod @env1:make_a.
	b := mod @env1:make_b.
	set := mod @env1:both.
	self assert: a @env1:name equals: 'a'.
	self assert: b @env1:name equals: 'b'.
	self assert: set @env1:items @env0:size equals: 2.
%

! --- AttributeAst cls vs self ---------------------------------------------

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillFastPath
	"`self.X` in an instance method whose first param is the
	conventional `self` still takes the instVar fast path —
	the AttributeAst change only narrowed the path, not removed
	it."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	inst := cls @env1:value: { 'hello' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'hello'.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfReadOfClassSideAttribute
	"`self.set_class` where `set_class` was declared at class
	body level (`set_class: type = list`) lives on the Smalltalk
	class side, not in instance layout.  Reading it from an
	instance method has to go through ___pyAttrLoad___: at
	runtime; before the AttributeAst fallback fix, the codegen
	emitted bare `set_class` and Smalltalk compile-errored with
	`undefined symbol set_class`.  The CallAst exclusion makes
	sure `self.<unknown-attr>(...)` doesn't take the direct
	unary-send fastpath either — that path bypasses
	___pyAttrLoad___: and would DNU on the metaclass."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	"`self.set_class` resolves through ___pyAttrLoad___: to the
	class-side attribute value (the built-in ``list`` class,
	which is OrderedCollection in Grail)."
	result := inst @env1:read_class_attr.
	self assert: result equals: OrderedCollection.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testCallOfClassSideAttribute
	"`self.set_class()` — load the class-side attribute (`list`)
	through ___pyAttrLoad___:, then invoke it.  Built-in classes
	gain callability through ``Object class >> value:value:``,
	which dispatches to ``__new__`` based on arity."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	result := inst @env1:make_via_class_attr.
	self assert: result class equals: OrderedCollection.
	self assert: result @env0:size equals: 0.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillWorksWhenClassHasNew
	"When a class defines __new__ (whose first param is `cls` by
	convention), the WHOLE class's selfParameterName had been
	picked from __new__ — turning every `self.X` reference in
	other methods into an UnboundLocal access.  After the
	ClassDefAst fix, selfParameterName prefers __init__'s first
	param, so `self.label` keeps reaching the instance instVar."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:HasNewAndInit.
	inst := cls @env1:value: { 'world' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'world'.
%

! --- Deep instance-variable discovery --------------------------------------

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromConditionalAssign
	"`if doc: self.doc = doc` inside __init__ — old scan missed
	the nested write; new chain propagates from AttributeAst up
	through the IfAst to ClassDefAst."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	"Construction triggers __init__; if doc isn't a real
	instVar the conditional write would silently fail with an
	'undefined symbol doc' compile error before runtime."
	self assert: (cls @env0:allInstVarNames @env0:includes: #doc).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #doc) equals: 'hello'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromAnnAssign
	"AnnAssign on self.X (`self.tags: list = []`) — different
	AST node from plain Assign; old scan only recognised
	AssignAst targets."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #tags).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromNestedCompound
	"`try / for / self.last_index = i` — write buried two
	compound statements deep inside __init__.  Propagation
	walks through every IfAst / ForAst / TryAst body branch."

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_index).
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromMethodOutsideInit
	"`self.name = name` in `configure(self, name)` — old scan
	walked __init__ only.  New walk covers every method body
	in the class."

	| mod cls obj |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #name).
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #name) equals: 'the-name'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromCls
	"`cls.last_doc = doc` inside __new__ — `cls` is the
	conventional class-attribute receiver name, but for
	instance-var discovery the AttributeAst chain treats it
	the same as `self`.  (Whether the runtime store actually
	hits the class side is a separate question handled by
	___pyAttrLoad___:.)"

	| mod cls |
	mod := self loadFixture: 'deep_instance_vars'.
	cls := mod @env1:DeepInit.
	self assert: (cls @env0:allInstVarNames @env0:includes: #last_doc).
%

! --- Generators: yield in function body --------------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThreeYields
	"Three consecutive yields drained via __next__ until StopIteration.
	The body runs in a forked GsProcess; consumer and producer
	synchronise through a pair of Semaphores."

	| mod gen v1 v2 v3 stopped |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:make_three.
	self assert: gen @env0:class equals: PythonGenerator.
	v1 := gen @env1:__next__.
	v2 := gen @env1:__next__.
	v3 := gen @env1:__next__.
	self assert: v1 equals: 'a'.
	self assert: v2 equals: 'b'.
	self assert: v3 equals: 'c'.
	stopped := [gen @env1:__next__. false]
		on: StopIteration do: [:ex | true].
	self assert: stopped.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorLocalStateAcrossYields
	"`count_up(n)` keeps a local `i` across yields, proving the
	GsProcess preserves the producer's stack between resumes."

	| mod gen result done |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:count_up: 4.
	result := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[result add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: result @env0:size equals: 4.
	self assert: (result @env0:at: 1) equals: 0.
	self assert: (result @env0:at: 4) equals: 3.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorInsideClassMethod
	"Generator declared as an instance method must close over the
	class's ``self`` correctly (the body block captures the receiver
	of the enclosing method)."

	| mod Counter c gen items done |
	mod := self loadFixture: 'generators'.
	Counter := mod @env1:Counter.
	c := Counter @env1:value: { 'item' } value: nil.
	gen := c @env1:labelled: 3.
	items := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[items add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: items @env0:size equals: 3.
	self assert: (items @env0:at: 1) equals: 'item_0'.
	self assert: (items @env0:at: 3) equals: 'item_2'.
%

! --- hashlib (Tier 1.5) ---------------------------------------------------

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibKnownVectors
	"``hashlib.sha256`` / ``md5`` should produce CPython-compatible
	hex digests."

	| mod |
	mod := self loadFixture: 'use_hashlib'.
	self assert: (mod @env1:sha256_of: 'hello' asByteArray)
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
	self assert: (mod @env1:md5_of: 'hello' asByteArray)
		equals: '5d41402abc4b2a76b9719d911017c592'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibStreamingUpdate
	"Multiple ``update()`` calls feed into the same digest — the
	streaming pattern HMAC and incremental APIs depend on."

	| mod parts result |
	mod := self loadFixture: 'use_hashlib'.
	parts := OrderedCollection new
		add: 'hello' asByteArray;
		add: ' world' asByteArray;
		yourself.
	result := mod @env1:streamed_sha256: parts.
	self assert: result
		equals: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibBlockAndDigestSizes
	"``digest_size`` / ``block_size`` are *value* attributes (not
	BoundMethod wraps) — exercises ``___pythonValueAttrs___`` on
	Hash class."

	| mod sizes |
	mod := self loadFixture: 'use_hashlib'.
	sizes := mod @env1:block_sizes.
	self assert: (sizes @env0:at: 1) equals: 64.   "md5"
	self assert: (sizes @env0:at: 2) equals: 64.   "sha256"
	self assert: (sizes @env0:at: 3) equals: 128.  "sha512"
	sizes := mod @env1:digest_sizes.
	self assert: (sizes @env0:at: 1) equals: 16.   "md5"
	self assert: (sizes @env0:at: 2) equals: 32.   "sha256"
	self assert: (sizes @env0:at: 3) equals: 64.   "sha512"
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibByName
	"``hashlib.new('sha256', data)`` factory with the algorithm
	supplied as a string."

	| mod |
	mod := self loadFixture: 'use_hashlib'.
	self assert: (mod @env1:by_name)
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibCopyIndependent
	"``Hash.copy()`` clones independently — mutating the original
	after a copy must not affect the clone's digest.  HMAC depends
	on this."

	| mod result clone divergent |
	mod := self loadFixture: 'use_hashlib'.
	result := mod @env1:hash_copy.
	clone := result @env0:at: 1.
	divergent := result @env0:at: 2.
	"Clone keeps sha256('hello') digest"
	self assert: clone
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
	"Original got 'hello world' appended"
	self assert: divergent
		equals: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'.
%

! --- hmac (Tier 1.5) ------------------------------------------------------

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacKnownVectorSha256
	"``hmac.new(key, msg, 'sha256').hexdigest()`` matches RFC 4231
	test vector parity with CPython."

	| mod result |
	mod := self loadFixture: 'use_hmac'.
	result := mod @env1:basic_sha256: 'secret' asByteArray _: 'message' asByteArray.
	self assert: result asLowercase
		equals: '8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b'.
%

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacStreaming
	"Multiple update() calls accumulate into the same MAC."

	| mod parts result |
	mod := self loadFixture: 'use_hmac'.
	parts := OrderedCollection new
		add: 'hello' asByteArray;
		add: ' ' asByteArray;
		add: 'world' asByteArray;
		yourself.
	result := mod @env1:streaming: 'k' asByteArray _: parts.
	self assert: result asLowercase
		equals: (mod @env1:basic_sha256: 'k' asByteArray _: 'hello world' asByteArray) asLowercase.
%

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacCompareDigestConstantTime
	"``hmac.compare_digest`` returns True for equal inputs, False
	for unequal — the basic correctness check (timing-leak resistance
	is the implementation's purpose; we just verify the answer)."

	| mod |
	mod := self loadFixture: 'use_hmac'.
	self assert: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abc' asByteArray).
	self deny: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abd' asByteArray).
	self deny: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abcd' asByteArray).
%

! --- base64 (Tier 1.5) ----------------------------------------------------

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64StandardEncode
	"``base64.b64encode(b'hello world')`` matches the RFC 4648
	expected output (with trailing '=' padding)."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:encode_standard: 'hello world' asByteArray.
	self assert: result equals: 'aGVsbG8gd29ybGQ=' asByteArray.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64StandardDecode
	"``base64.b64decode`` reverses the encoding, stripping '='."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:decode_standard: 'aGVsbG8gd29ybGQ=' asByteArray.
	self assert: result equals: 'hello world' asByteArray.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64Roundtrip
	"Various lengths exercise the 0/1/2 byte tail cases."

	| mod |
	mod := self loadFixture: 'use_base64'.
	#('a' 'ab' 'abc' 'abcd' 'abcde' 'abcdef' '' 'hello world!') do: [:s |
		self assert: (mod @env1:roundtrip: s asByteArray)
			description: 'roundtrip failed for: ' , s
	]
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64UrlsafeAlphabet
	"URL-safe variant: ``+`` → ``-``, ``/`` → ``_``.  Bytes that
	produce both characters in the standard alphabet differ in the
	URL-safe form."

	| mod safeEnc stdEnc data |
	mod := self loadFixture: 'use_base64'.
	"0xFB 0xEF 0xFF → '++//' in standard b64."
	data := ByteArray new: 3.
	data @env0:at: 1 put: 16rFB.
	data @env0:at: 2 put: 16rEF.
	data @env0:at: 3 put: 16rFF.
	stdEnc := mod @env1:encode_standard: data.
	safeEnc := mod @env1:encode_urlsafe: data.
	self assert: stdEnc equals: '++//' asByteArray.
	self assert: safeEnc equals: '--__' asByteArray.
	self assert: (mod @env1:decode_urlsafe: safeEnc) equals: data.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64DecodeStrInput
	"Decoder accepts a Python str (Grail Unicode7), encoded to ASCII
	internally."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:decode_from_str: 'aGVsbG8='.
	self assert: result equals: 'hello' asByteArray.
%

! --- time module ----------------------------------------------------------

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeCurrentMatchesNs
	"time() and time_ns() should agree within a second on the moment of
	the call (both read DateTime now sequentially)."

	| mod secs nanos |
	mod := self loadFixture: 'use_time'.
	secs := mod @env1:get_time.
	nanos := mod @env1:get_time_ns.
	self assert: ((nanos / 1000000000) asFloat - secs) abs < 1.0.
	"Sanity: we should be after 2020 and before 2100."
	self assert: secs > 1577836800.
	self assert: secs < 4102444800
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeMonotonicProgresses
	"monotonic() never goes backwards across two successive reads."

	| mod m1 m2 |
	mod := self loadFixture: 'use_time'.
	m1 := mod @env1:get_monotonic.
	m2 := mod @env1:get_monotonic.
	self assert: m2 >= m1
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeSleepAdvances
	"sleep(0.1) elapses at least 0.05 seconds (loose lower bound to
	survive scheduling jitter on busy CI)."

	| mod elapsed |
	mod := self loadFixture: 'use_time'.
	elapsed := mod @env1:measure_sleep: 0.1.
	self assert: elapsed >= 0.05.
	self assert: elapsed < 5.0
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeGmtimeStruct
	"gmtime() returns a 9-tuple with year/month/day/hour/min/sec/wday/yday/isdst."

	| mod t |
	mod := self loadFixture: 'use_time'.
	t := mod @env1:get_gmtime.
	self assert: t size equals: 9.
	self assert: (t @env1:__getitem__: 0) > 2020.
	"Month 1..12."
	self assert: ((t @env1:__getitem__: 1) between: 1 and: 12).
	"isdst -1 = unknown."
	self assert: (t @env1:__getitem__: 8) equals: -1
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeGmtimeKnownEpoch
	"gmtime(0) is 1970-01-01 00:00:00 UTC."

	| mod t |
	mod := self loadFixture: 'use_time'.
	t := mod @env1:get_gmtime_of: 0.
	self assert: (t @env1:__getitem__: 0) equals: 1970.
	self assert: (t @env1:__getitem__: 1) equals: 1.
	self assert: (t @env1:__getitem__: 2) equals: 1.
	self assert: (t @env1:__getitem__: 3) equals: 0.
	self assert: (t @env1:__getitem__: 4) equals: 0.
	self assert: (t @env1:__getitem__: 5) equals: 0
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeStrftimeIso
	"strftime renders a fixed instant as expected ISO-style text."

	| mod s |
	mod := self loadFixture: 'use_time'.
	"1700000000 = 2023-11-14 22:13:20 UTC"
	s := mod @env1:format_gmtime: 1700000000 _: '%Y-%m-%d %H:%M:%S'.
	self assert: s equals: '2023-11-14 22:13:20'
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeAsctimeOfEpoch
	"asctime(gmtime(0)) renders 'Thu Jan 01 00:00:00 1970'."

	| mod s |
	mod := self loadFixture: 'use_time'.
	s := mod @env1:asctime_of: 0.
	self assert: s equals: 'Thu Jan 01 00:00:00 1970'
%

! --- json module ----------------------------------------------------------

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsList
	"dumps emits JSON for a list of primitives."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_list equals: '[1, 2, 3, "x"]'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsSorted
	"sort_keys=True returns keys in sorted order."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_sorted equals: '{"a": 1, "b": 2, "c": 3}'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsIndent
	"indent=2 inserts newlines and per-depth spaces."

	| mod expected |
	mod := self loadFixture: 'use_json'.
	expected := '{
  "a": 1,
  "b": 2
}'.
	self assert: mod @env1:dumps_indent equals: expected
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsUnicodeEscape
	"ensure_ascii=True (default) escapes non-ASCII to \\uXXXX."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_unicode_escape equals: '"\u00e9"'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsSimple
	"loads parses primitives and dict membership."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_simple.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: (result @env1:__getitem__: 'b') equals: 'two'.
	self assert: (result @env1:__getitem__: 'c') equals: None.
	self assert: (result @env1:__getitem__: 'd') equals: true
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsList
	"loads parses array with mixed primitives."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_list.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.5.
	self assert: (result @env1:__getitem__: 2) equals: -3.
	self assert: (result @env1:__getitem__: 3) equals: 'x'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsNested
	"loads handles nested arrays inside objects."

	| mod result inner middle |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_nested.
	inner := result @env1:__getitem__: 'a'.
	self assert: (inner @env1:__getitem__: 0) equals: 1.
	self assert: (inner @env1:__getitem__: 1) equals: 2.
	middle := inner @env1:__getitem__: 2.
	self assert: (middle @env1:__getitem__: 'b') equals: 'c'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsStringEscapes
	"loads expands JSON escape sequences."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_string_escapes.
	self assert: result equals: ('hello' , (String with: Character lf) , (String with: Character tab) , 'world' , (String with: (Character codePoint: 16rE9)))
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsWhitespace
	"loads tolerates arbitrary whitespace between tokens."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_with_whitespace.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: ((result @env1:__getitem__: 'b') @env1:__getitem__: 0) equals: 2.
	self assert: ((result @env1:__getitem__: 'b') @env1:__getitem__: 1) equals: 3
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonRoundtripPrimitives
	"loads(dumps(x)) preserves primitive values."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:roundtrip: 42.
	self assert: result equals: 42.
	result := mod @env1:roundtrip: 'hello'.
	self assert: result equals: 'hello'.
	result := mod @env1:roundtrip: true.
	self assert: result equals: true
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonRejectsExtra
	"loads raises ValueError for trailing data."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:reject_extra equals: 'caught'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsDefault
	"dumps(obj, default=fn) calls fn for unknown types."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_with_default equals: '{"thing": 42}'
%

! --- datetime module ------------------------------------------------------

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeConstructor
	"datetime(year, month, day, hour, minute, second) builds a value
	with the expected fields."

	| mod dt fields |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:make_datetime.
	fields := mod @env1:datetime_fields: dt.
	self assert: (fields @env1:__getitem__: 0) equals: 2024.
	self assert: (fields @env1:__getitem__: 1) equals: 5.
	self assert: (fields @env1:__getitem__: 2) equals: 18.
	self assert: (fields @env1:__getitem__: 3) equals: 13.
	self assert: (fields @env1:__getitem__: 4) equals: 45.
	self assert: (fields @env1:__getitem__: 5) equals: 30
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeIsoformat
	"datetime.isoformat() emits YYYY-MM-DDTHH:MM:SS."

	| mod dt |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:make_datetime.
	self assert: (mod @env1:isoformat_of: dt) equals: '2024-05-18T13:45:30'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeFromIsoRoundtrip
	"fromisoformat parses what isoformat emits."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: mod @env1:round_trip_iso equals: '2024-05-18T13:45:30'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeNow
	"datetime.now() returns a current-year value."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: mod @env1:now_is_recent equals: true
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeTimestampRoundtrip
	"fromtimestamp(ts).timestamp() ~ ts."

	| mod ts result |
	mod := self loadFixture: 'use_datetime'.
	ts := 1700000000.0.
	result := mod @env1:timestamp_roundtrip: ts.
	self assert: (result - ts) abs < 1.0
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimedeltaConstructor
	"timedelta(days=2, hours=3, minutes=15) totals to 2.135... days."

	| mod td total |
	mod := self loadFixture: 'use_datetime'.
	td := mod @env1:make_timedelta.
	total := mod @env1:timedelta_total_seconds: td.
	self assert: total equals: ((2 * 86400) + (3 * 3600) + (15 * 60))
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimePlusTimedelta
	"datetime + timedelta returns a new datetime offset by the delta."

	| mod dt fields |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:add_timedelta.
	fields := mod @env1:datetime_fields: dt.
	self assert: (fields @env1:__getitem__: 0) equals: 2024.
	self assert: (fields @env1:__getitem__: 1) equals: 1.
	self assert: (fields @env1:__getitem__: 2) equals: 11.
	self assert: (fields @env1:__getitem__: 3) equals: 5
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeSubtraction
	"datetime - datetime returns a timedelta in seconds."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:subtract_datetimes.
	self assert: result equals: 10 * 86400 + (5 * 3600)
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimezoneUtc
	"datetime.timezone.utc is a singleton."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:utc_timezone.
	self assert: tz equals: mod @env1:utc_timezone.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeWithTz
	"datetime(..., tzinfo=timezone.utc) stores the tz and includes
	the offset in isoformat."

	| mod dt iso |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:datetime_with_tz.
	iso := dt @env1:isoformat.
	self assert: iso equals: '2024-05-18T12:00:00+00:00'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeNowWithUtc
	"datetime.now(timezone.utc) attaches the supplied tz."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:datetime_now_utc.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testIsoformatParsesTz
	"fromisoformat extracts +00:00 and Z as UTC, fixed offsets as
	timezone(timedelta(...))."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:iso_with_tz: '2024-05-18T12:00:00Z'.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'.
	tz := mod @env1:iso_with_tz: '2024-05-18T12:00:00+00:00'.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimedeltaArithmetic
	"timedelta + timedelta / timedelta - timedelta."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:timedelta_arithmetic.
	self assert: (result @env1:__getitem__: 0) equals: 45.0.
	self assert: (result @env1:__getitem__: 1) equals: 15.0
%

! --- ipaddress module -----------------------------------------------------

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressParseAndPrint
	"Round-trip a dotted-quad through ip_address(str(...))."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:parse_ipv4: '192.168.1.1') equals: '192.168.1.1'.
	self assert: (mod @env1:parse_ipv4: '0.0.0.0') equals: '0.0.0.0'.
	self assert: (mod @env1:parse_ipv4: '255.255.255.255') equals: '255.255.255.255'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressPackedInt
	"int(IPv4Address) returns the 32-bit packed value."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:packed_int: '0.0.0.1') equals: 1.
	self assert: (mod @env1:packed_int: '1.0.0.0') equals: 16r01000000.
	self assert: (mod @env1:packed_int: '192.168.1.1') equals: 16rC0A80101
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressLoopback
	"127.x.x.x is loopback."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_loopback: '127.0.0.1') equals: true.
	self assert: (mod @env1:is_loopback: '127.255.255.255') equals: true.
	self assert: (mod @env1:is_loopback: '128.0.0.0') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressPrivate
	"RFC 1918 ranges (+ loopback / link-local) are private."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_private: '10.0.0.1') equals: true.
	self assert: (mod @env1:is_private: '172.16.0.1') equals: true.
	self assert: (mod @env1:is_private: '172.31.255.255') equals: true.
	self assert: (mod @env1:is_private: '172.32.0.1') equals: false.
	self assert: (mod @env1:is_private: '192.168.1.1') equals: true.
	self assert: (mod @env1:is_private: '8.8.8.8') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressGlobal
	"Public addresses are global; private/multicast/reserved aren't."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_global: '8.8.8.8') equals: true.
	self assert: (mod @env1:is_global: '192.168.1.1') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressLinkLocalAndMulticast
	"169.254/16 is link-local; 224/4 is multicast."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_link_local: '169.254.1.1') equals: true.
	self assert: (mod @env1:is_link_local: '10.0.0.1') equals: false.
	self assert: (mod @env1:is_multicast: '224.0.0.1') equals: true.
	self assert: (mod @env1:is_multicast: '192.168.1.1') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressNetworkString
	"ip_network round-trips through str()."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_str: '192.168.1.0/24') equals: '192.168.1.0/24'.
	self assert: (mod @env1:network_str: '10.0.0.0/8') equals: '10.0.0.0/8'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressNetworkContains
	"addr in network for matching / non-matching addresses."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_contains: '192.168.1.0/24' _: '192.168.1.50') equals: true.
	self assert: (mod @env1:network_contains: '192.168.1.0/24' _: '192.168.2.1') equals: false.
	self assert: (mod @env1:network_contains: '10.0.0.0/8' _: '10.99.0.1') equals: true
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressBroadcastAddress
	"Network broadcast is the last address in the block."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_broadcast: '192.168.1.0/24') equals: '192.168.1.255'.
	self assert: (mod @env1:network_broadcast: '10.0.0.0/8') equals: '10.255.255.255'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressRejectsIPv6
	"IPv6 is not supported yet; ip_address raises ValueError."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: mod @env1:reject_ipv6 equals: 'rejected'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressRejectsBadOctet
	"Out-of-range octet raises ValueError."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: mod @env1:reject_bad_octet equals: 'rejected'
%

! --- mimetypes module -----------------------------------------------------

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessHtml
	"index.html resolves to text/html with no encoding."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_html.
	self assert: (result @env1:__getitem__: 0) equals: 'text/html'.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessPng
	"img/header.png walks into the directory and finds image/png."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_png.
	self assert: (result @env1:__getitem__: 0) equals: 'image/png'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesWithEncoding
	"archive.tar.gz -> (application/x-tar, gzip).  The encoding map
	strips .gz to expose the underlying type."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_with_encoding.
	self assert: (result @env1:__getitem__: 0) equals: 'application/x-tar'.
	self assert: (result @env1:__getitem__: 1) equals: 'gzip'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesUnknown
	"Unknown extensions return (None, None)."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_unknown.
	self assert: (result @env1:__getitem__: 0) equals: None.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesExtensionless
	"Files with no extension return (None, None)."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_extensionless.
	self assert: (result @env1:__getitem__: 0) equals: None.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesStripsQuery
	"Query-string suffixes do not block extension detection."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_through_query.
	self assert: (result @env1:__getitem__: 0) equals: 'text/css'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessExtension
	"image/jpeg reverse-resolves to one of the known extensions."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_ext_of_jpeg.
	self assert: (#('.jpeg' '.jpg') includes: result)
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesAddType
	"add_type extends the runtime map."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:add_custom_then_guess.
	self assert: (result @env1:__getitem__: 0) equals: 'application/x-grail'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesInited
	"mimetypes.inited is True after the module loads."

	| mod |
	mod := self loadFixture: 'use_mimetypes'.
	self assert: mod @env1:inited_after_import equals: true
%

! --- struct module --------------------------------------------------------

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructCalcsizeBasic
	"calcsize reports format-string byte counts."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: (mod @env1:calc_size: '!Q') equals: 8.
	self assert: (mod @env1:calc_size: '<H') equals: 2.
	self assert: (mod @env1:calc_size: '>IHB') equals: 7.
	self assert: (mod @env1:calc_size: '5s') equals: 5.
	self assert: (mod @env1:calc_size: '>BxH') equals: 4
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPackUnsignedQ
	"!Q (big-endian unsigned 8-byte) round-trip."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_be_q: 16r12345678AABBCCDD.
	self assert: packed equals: #[16r12 16r34 16r56 16r78 16rAA 16rBB 16rCC 16rDD] asByteArray.
	self assert: (mod @env1:unpack_be_q: packed) equals: 16r12345678AABBCCDD
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPackLittleEndianH
	"<H (little-endian unsigned 2-byte) writes low byte first."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_le_h: 16rCAFE.
	self assert: packed equals: #[16rFE 16rCA] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructSignedByteRoundtrip
	"b (signed char): -1 packs to 0xFF and unpacks back to -1."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_signed_byte: -1.
	self assert: packed equals: #[16rFF] asByteArray.
	self assert: (mod @env1:unpack_signed_byte: packed) equals: -1
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructUnsignedByteHigh
	"B with a positive value above 127."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: (mod @env1:pack_unsigned_byte: 255) equals: #[16rFF] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructString
	"5s packs exactly 5 bytes (zero-pads short input, no terminator)."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_string: 'abc' asByteArray.
	self assert: packed equals: #[97 98 99 0 0] asByteArray.
	self assert: (mod @env1:unpack_string: 'hello' asByteArray) equals: 'hello' asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructDoubleRoundtrip
	">d round-trips IEEE 754 double exactly for representable values."

	| mod packed unpacked |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_double: 3.14.
	self assert: packed size equals: 8.
	unpacked := mod @env1:unpack_double: packed.
	self assert: (unpacked - 3.14) abs < 1.0e-12
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructMixedFormat
	">IHB packs a mixed-width tuple in declaration order."

	| mod packed unpacked |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_mixed: 16rDEADBEEF _: 16rABCD _: 16r42.
	self assert: packed size equals: 7.
	self assert: packed equals: #[16rDE 16rAD 16rBE 16rEF 16rAB 16rCD 16r42] asByteArray.
	unpacked := mod @env1:unpack_mixed: packed.
	self assert: (unpacked @env1:__getitem__: 0) equals: 16rDEADBEEF.
	self assert: (unpacked @env1:__getitem__: 1) equals: 16rABCD.
	self assert: (unpacked @env1:__getitem__: 2) equals: 16r42
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPaddingByte
	"`x` inserts a single zero byte and consumes no value."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: mod @env1:pack_with_padding equals: #[1 0 16rCA 16rFE] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructTimestampRoundtrip
	"itsdangerous-style: pack a Unix epoch into a big-endian Q,
	round-trip back."

	| mod ts |
	mod := self loadFixture: 'use_struct'.
	ts := 1700000000.
	self assert: (mod @env1:roundtrip_timestamp: ts) equals: ts
%

! --- warnings module ------------------------------------------------------

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsWarnDefault
	"warn() with default UserWarning category prints to Transcript and
	returns normally."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_default equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsWarnCategory
	"warn(message, DeprecationWarning) accepts an explicit category."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_with_category equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsIgnore
	"simplefilter('ignore') silently drops warnings."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_ignored equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsErrorFilter
	"simplefilter('error') turns warnings into exceptions."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_as_error equals: 'caught'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsCatchRestoresFilters
	"catch_warnings() restores the filter list on __exit__."

	| mod result |
	mod := self loadFixture: 'use_warnings'.
	result := mod @env1:warn_catch_restores.
	self assert: (result @env1:__getitem__: 0) equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 0
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsFormatwarning
	"formatwarning() produces the CPython-style text."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:format_a_warning equals: 'file.py:42: UserWarning: msg'
%

! --- secrets module -------------------------------------------------------

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenBytesDefault
	"token_bytes() returns 32 bytes by default."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_default.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 32
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenBytesNbytes
	"token_bytes(n) returns exactly n bytes."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_bytes_n: 8.
	self assert: result size equals: 8
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenHexLength
	"token_hex(n) returns a 2*n-character lowercase hex string."

	| mod result n |
	mod := self loadFixture: 'use_secrets'.
	n := 16.
	result := mod @env1:token_hex_n: n.
	self assert: result size equals: n * 2.
	"All chars in [0-9a-f]"
	result do: [:c |
		self assert: ((c >= $0 and: [c <= $9]) or: [c >= $a and: [c <= $f]])
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenUrlsafeAlphabet
	"token_urlsafe(n) returns base64-urlsafe chars only ([A-Za-z0-9-_])."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_urlsafe_n: 12.
	"Length: ceil(n*4/3) without padding = 16 for n=12"
	self assert: result size equals: 16.
	result do: [:c |
		self assert:
			((c >= $A and: [c <= $Z])
				or: [(c >= $a and: [c <= $z])
				or: [(c >= $0 and: [c <= $9])
				or: [c = $- or: [c = $_]]]])
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokensAreRandom
	"Two consecutive token_bytes calls should produce different
	results (overwhelmingly likely - 1 in 2^128)."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: mod @env1:two_tokens_differ equals: true
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsChoice
	"choice returns a member of the input sequence."

	| mod result seq |
	mod := self loadFixture: 'use_secrets'.
	seq := list @env1:value: { #( 'a' 'b' 'c' 'd' 'e' ) @env0:asOrderedCollection } value: nil.
	result := mod @env1:choice_from: seq.
	self assert: (#('a' 'b' 'c' 'd' 'e') includes: result)
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsRandbelow
	"randbelow(n) returns an integer in [0, n)."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	1 to: 20 do: [:i |
		result := mod @env1:randbelow_n: 10.
		self assert: result >= 0.
		self assert: result < 10
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsRandbits
	"randbits(k) returns a non-negative int < 2^k."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:randbits_k: 8.
	self assert: result >= 0.
	self assert: result < 256
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsCompareDigestEqual
	"compare_digest returns true for equal inputs."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: (mod @env1:compare_equal: 'hello' _: 'hello') equals: true.
	self assert: (mod @env1:compare_equal: 'hello' asByteArray _: 'hello' asByteArray) equals: true
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsCompareDigestDiffers
	"compare_digest returns false for different inputs."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: (mod @env1:compare_equal: 'hello' _: 'world') equals: false.
	self assert: (mod @env1:compare_equal: 'hello' _: 'helloo') equals: false
%

! --- contextlib + with-statement ------------------------------------------

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithClosing
	"`with closing(t) as obj:` calls __enter__ (returns wrapped object),
	runs body, then __exit__ which closes t."

	| mod result |
	mod := self loadFixture: 'use_contextlib'.
	result := mod @env1:closing_works.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 7
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithSuppressCatches
	"`with suppress(ValueError):` swallows the matching exception so
	control resumes after the with-block."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:suppress_catches equals: true
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithSuppressLetsOtherThrough
	"suppress(ValueError) re-raises TypeError so the enclosing
	try/except sees it."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:suppress_lets_other_through equals: 'caught'
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithNullcontextYieldsValue
	"`with nullcontext(42) as v:` binds v to the enter result."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:nullcontext_yields equals: 42
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testExitStackOrders
	"ExitStack runs callbacks in LIFO order on exit."

	| mod order |
	mod := self loadFixture: 'use_contextlib'.
	order := mod @env1:exitstack_orders.
	self assert: order size equals: 3.
	self assert: (order @env1:__getitem__: 0) equals: 'c'.
	self assert: (order @env1:__getitem__: 1) equals: 'b'.
	self assert: (order @env1:__getitem__: 2) equals: 'a'
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testContextmanagerYieldsValue
	"@contextmanager turns `yield value` into __enter__'s return."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:contextmanager_yields equals: 99
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testContextmanagerRunsCleanup
	"@contextmanager's finally-after-yield runs on exit."

	| mod log |
	mod := self loadFixture: 'use_contextlib'.
	log := mod @env1:contextmanager_runs_cleanup.
	self assert: log size equals: 3.
	self assert: (log @env1:__getitem__: 0) equals: 'enter'.
	self assert: (log @env1:__getitem__: 1) equals: 'body'.
	self assert: (log @env1:__getitem__: 2) equals: 'exit'
%

! --- Blinker end-to-end (Tier 1) ------------------------------------------

category: 'Grail-Tests - Blinker'
method: FlaskScaffoldingTestCase
testBlinkerNamedSignal
	"``blinker.NamedSignal(name, doc)`` constructs through Signal's
	super-routed __init__ — exercises the Super-via-varargs
	dispatch (``___init__:kw:`` parent + ``with:with:performMethod:``
	bypass) and the metaclass-chain walk for ``self.set_class`` from
	a subclass instance (class-side instVars are per-class)."

	| blinker NS ns |
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/blinker/__init__.py') name: 'blinker'.
	blinker := (importlib @env1:modules) @env0:at: 'blinker' @env0:asSymbol.
	NS := blinker @env1:NamedSignal.
	ns := NS @env1:value: { 'my_event'. 'docstring' } value: nil.
	self assert: (ns @env1:name) equals: 'my_event'.
%

category: 'Grail-Tests - Blinker'
method: FlaskScaffoldingTestCase
testBlinkerNamespaceSignalFactory
	"``Namespace().signal(name)`` round-trips: Namespace subclasses
	dict[str, NamedSignal] (subscripted base via dict.__getitem__),
	signal() looks up or creates a NamedSignal under that name."

	| blinker Namespace space sig |
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/blinker/__init__.py') name: 'blinker'.
	blinker := (importlib @env1:modules) @env0:at: 'blinker' @env0:asSymbol.
	Namespace := blinker @env1:Namespace.
	space := Namespace @env1:value: #() value: nil.
	sig := space @env1:signal: 'foo'.
	self assert: (sig @env1:name) equals: 'foo'.
	"Repeat lookup returns the SAME signal."
	self assert: (space @env1:signal: 'foo') == sig.
%

! --- Unified attribute-call protocol --------------------------------------

category: 'Grail-Tests - AttrCall'
method: FlaskScaffoldingTestCase
testAttrCallInvokesClassValue
	"``obj.X()`` where X resolves to a class (class-side attribute
	holding a class) must invoke ``__new__`` to construct, not just
	read the class.  The unified call protocol routes 0-arg
	attribute calls through ___pyAttrLoad___ + ``value:value:`` —
	classes respond to ``value:value:`` via ``object class``."

	| mod h inst Inner |
	mod := self loadFixture: 'attr_call_protocol'.
	h := mod @env1:make.
	inst := h @env1:make_inner.
	Inner := mod @env1:Inner.
	self assert: inst class equals: Inner.
	self assert: (inst @env1:label) equals: 'inner-built'.
%

! --- Generator protocol: send / throw / close ------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorSend
	"``gen.send(value)`` resumes the generator with ``value`` as the
	yield expression's value.  Adder generator accumulates sent
	values; first ``next()`` reaches the initial yield (total=0),
	subsequent ``send(x)`` updates total and yields the new total."

	| mod g first second third |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:adder.
	first := g @env1:__next__.
	second := g @env1:send: 10.
	third := g @env1:send: 5.
	self assert: first equals: 0.
	self assert: second equals: 10.
	self assert: third equals: 15.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThrowCaught
	"``gen.throw(ex)`` injects ``ex`` at the suspended yield point.
	Generators that wrap a yield in try/except can catch the thrown
	exception and continue yielding past it."

	| mod g first afterCatch tail |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:catches_throw.
	first := g @env1:__next__.
	afterCatch := g @env1:throw: (ValueError @env0:new).
	tail := g @env1:__next__.
	self assert: first equals: 'before'.
	self assert: afterCatch equals: 'caught'.
	self assert: tail equals: 'after'.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorClose
	"``gen.close()`` injects GeneratorExit at the suspended yield
	point.  Body ``finally`` clauses fire as the exception unwinds,
	so cleanup runs even though the consumer never drains the
	generator to StopIteration."

	| mod holder g closeResult |
	mod := self loadFixture: 'generator_protocol'.
	holder := OrderedCollection new add: 'open'; yourself.
	g := mod @env1:cleanup_marker: holder.
	g @env1:__next__.
	g @env1:__next__.
	closeResult := g @env1:close.
	self assert: closeResult equals: None.
	self assert: (holder @env0:at: 1) equals: 'closed'.
%

! --- FunctionDefAst: varargs method prologue (kwargs fallback, *args, **kwargs) ---

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwargFallbackForNamedParam
	"A named parameter (with default) is satisfied by a keyword
	argument when not passed positionally.  Before the fix, the
	varargs prologue ignored kwargs for named params and the
	default fired even when the caller had supplied the keyword."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Pass `a` positionally, `b` and `c` as kwargs."
	result := obj
		@env1:_by_default: { 1 }
		kw: (IdentityKeyValueDictionary new
			at: #b put: 20;
			at: #c put: 300;
			yourself).
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 20.
	self assert: (result @env0:at: 3) equals: 300.
	"Defaults still fire when no kwargs supplied."
	result := obj @env1:_by_default: { 1 } kw: nil.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
	self assert: (result @env0:at: 3) equals: 3.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testStarArgsAndStarStarKwargs
	"*args collects leftover positionals as a tuple; **kwargs
	collects unused keyword args into a dict.  Both bindings were
	missing from the class-method varargs path before the codegen
	parity fix."

	| mod cls obj result tail kw |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	result := obj
		@env1:_collect_extra: { 'h'. 'a'. 'b' }
		kw: (IdentityKeyValueDictionary new
			at: #extra put: 99;
			yourself).
	self assert: (result @env0:at: 1) equals: 'h'.
	tail := result @env0:at: 2.
	self assert: tail @env0:size equals: 2.
	self assert: (tail @env0:at: 1) equals: 'a'.
	self assert: (tail @env0:at: 2) equals: 'b'.
	kw := result @env0:at: 3.
	self assert: (kw @env0:at: #extra) equals: 99.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwonlyArgs
	"Keyword-only arguments must come from kwargs (no positional
	fallback); missing required kwonly raises TypeError."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Supply both."
	result := obj
		@env1:_kwonly: #()
		kw: (IdentityKeyValueDictionary new
			at: #x put: 10;
			at: #y put: 200;
			yourself).
	self assert: (result @env0:at: 1) equals: 10.
	self assert: (result @env0:at: 2) equals: 200.
	"y has a default."
	result := obj
		@env1:_kwonly: #()
		kw: (IdentityKeyValueDictionary new at: #x put: 11; yourself).
	self assert: (result @env0:at: 1) equals: 11.
	self assert: (result @env0:at: 2) equals: 20.
%

! --- Class/instance introspection: __name__ and __dict__ -------------------

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testBuiltinClassName
	"``cls.__name__`` works on built-in Python types via the
	``object class >> __name__`` (env-1) fallback inherited
	through the metaclass chain."

	self assert: (OrderedCollection @env1:__name__) equals: 'OrderedCollection'.
	self assert: (KeyValueDictionary @env1:__name__) equals: 'KeyValueDictionary'.
	self assert: (ExecBlock @env1:__name__) equals: 'ExecBlock'.
	self assert: (BoundMethod @env1:__name__) equals: 'BoundMethod'.
%

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testInstanceDict
	"`obj.__dict__` returns the per-instance attribute dictionary
	(``___dict___``).  Attributes written through PythonInstance's
	DNU dispatch path land here; class-compile-time-discovered
	instVars do not (documented limitation).  Used by blinker's
	cached-property idiom ``if 'X' in self.__dict__:``."

	| mod cls obj d |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	obj := cls @env1:value: { 'label-value' } value: nil.
	"`label` was discovered as an inst var from `self.label = label` —
	stored as a Smalltalk instVar, NOT in ___dict___, so __dict__ is
	expected to be empty here."
	d := obj @env1:__dict__.
	self assert: (d @env0:isKindOf: KeyValueDictionary).
	"Add a runtime attribute via the DNU setter path — that DOES land
	in ___dict___."
	obj @env1:dynamicAttr: 42.
	d := obj @env1:__dict__.
	self assert: (d @env0:at: #dynamicAttr) equals: 42.
%

! --- CallAst: bare zero-arg super() ---------------------------------------

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperOneArgInit
	"`super().__init__(x)` from a subclass — codegen rewrites the
	bare ``super()`` to a Super proxy bound to (lexical class, self),
	and the direct unary send ``__init__: x`` routes through Super''s
	DNU which dispatches via ``with:performMethod:`` to the parent
	class's compiled ``__init__:`` with `obj` substituted as receiver
	(bypassing the override that triggered the super call)."

	| mod Derived inst |
	mod := self loadFixture: 'super_calls'.
	Derived := mod @env1:Derived.
	inst := Derived @env1:value: { 10. 20 } value: nil.
	self assert: (inst @env1:x) equals: 10.
	self assert: (inst @env1:y) equals: 20.
%

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperZeroArgInit
	"`super().__init__()` with no args — Super DNU dispatches via
	``performMethod:`` (the 0-arg primitive form) to the parent
	class's ``__init__``.  Used by collections.defaultdict.__init__
	to invoke object.__init__."

	| mod ZeroArg inst |
	mod := self loadFixture: 'super_calls'.
	ZeroArg := mod @env1:ZeroArgSuper.
	inst := ZeroArg @env1:value: #() value: nil.
	self assert: (inst @env1:flag) equals: true.
%

! --- SubscriptAst: class-subscript as base ---------------------------------

category: 'Grail-Tests - SubscriptAst'
method: FlaskScaffoldingTestCase
testSubscriptedBuiltinAsBaseClass
	"`class X(dict[K, V]):` evaluates ``dict[K, V]`` at runtime as
	part of the base-class list.  Grail's dict class-side
	__getitem__: stub returns the class itself so the parameterized
	base resolves to the origin class (KeyValueDictionary).  Without
	the stub, class-statement execution DNUs on the metaclass."

	| mod cls inst |
	mod := self loadFixture: 'subscripted_base'.
	cls := mod @env1:StringKeyedDict.
	"The class inherits from KeyValueDictionary (Grail's dict)."
	self assert: cls superclass equals: KeyValueDictionary.
	inst := mod @env1:make.
	self assert: (inst @env0:at: 'k') equals: 1.
	self assert: (inst @env1:label) equals: 'string-keyed'.
%
