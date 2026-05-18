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
