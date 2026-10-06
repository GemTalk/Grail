! ===============================================================================
! CharacterCollection Methods (Python 'str' type)
! ===============================================================================
! This file contains method implementations for CharacterCollection, the common
! superclass of both String (→ Unicode7) and MultiByteString (→ Unicode16,
! Unicode32). Installing here makes all Python string methods available on
! every string subclass automatically.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================
set compile_env: 0

! ------------------- Remove existing Python methods from CharacterCollection
expectvalue /Metaclass3
doit
"Remove from CharacterCollection (the target) and from String/Unicode7
 (old targets, in case of reinstall)."
CharacterCollection removeAllMethods: 1.
CharacterCollection class removeAllMethods: 1.
String removeAllMethods: 1.
String class removeAllMethods: 1.
Unicode7 removeAllMethods: 1.
Unicode7 class removeAllMethods: 1.
Symbol removeAllMethods: 1.
Symbol class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__
	"Create a new empty str instance.
	In Python: str() or str.__new__(str)"

	^ '' @env0:copy
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj
	"Create a new instance of `self` (the cls argument) whose content
	is ``str(obj)``.  For ``str(obj)`` the receiver is the canonical
	concrete str class (Unicode7), and the result is just a string;
	for ``str.__new__(Markup, obj)`` the receiver is Markup, and the
	result is a Markup instance carrying the same characters.  This
	is what makes ``super().__new__(cls, value)`` produce a populated
	instance of the subclass in user code like markupsafe.Markup."

	| source result |
	"CANONICAL RECEIVER = Python's ``str(obj)''.  This branch used to live in
	builtins>>str:, reached because ``str(x)'' compiled to a direct
	``builtins str: x'' send.  That fast-path method is what made the NAME
	``str'' resolve to a BoundMethod wrapper instead of the class
	(NameAst>>isFastPathBuiltinName:), so ``type('a') is str'' was false and
	dir(str) described a function -- 53 of str's names missing.  Removing the
	method fixes the name; the semantics it carried have to land HERE, which is
	where CPython keeps them anyway.

	A plain kernel string is answered UNCHANGED.  Not just an optimisation: the
	allocate-and-copy below builds a string of the RECEIVER's class, so a wide
	Unicode16/32 (auto-promoted by content, not a user subclass) copied into a
	narrow Unicode7 would be corrupted."
	"Canonical = ANY kernel string class, not only the ``str'' global (Unicode7).
	A str-mixin enum resolves its member type by walking the storage chain, and
	that walk answers Unicode32 -- so a Unicode7-only test sent that receiver
	down the SUBCLASS allocate path and left the member's value raw (1 rather
	than '1'), which is what broke the str-mixin enum tests."
	((self @env0:== Unicode7)
		or: [(self @env0:== Unicode16)
		or: [(self @env0:== Unicode32)
		or: [(self @env0:== String)
		or: [self @env0:== Symbol]]]]) ifTrue: [
		obj @env0:ifNil: [^ '' @env0:copy].
		(obj isKindOf: CharacterCollection) ifTrue: [
			| r isKernelString |
			"__str__ is ALWAYS consulted, kernel string or not.  Answering a
			kernel-class receiver unchanged looks like a safe fast path and is
			not: a str-mixin enum member (``class E(str, Enum)'') IS stored in a
			kernel string class, and its forced Enum __str__ answers 'E.name'
			while its own character content is something else entirely.
			Short-circuiting on the class returned the raw content and broke
			five enum tests."
			isKernelString := (obj @env0:class @env0:== Unicode7)
				or: [(obj @env0:class @env0:== Unicode16)
				or: [(obj @env0:class @env0:== Unicode32)
				or: [(obj @env0:class @env0:== String)
				or: [obj @env0:class @env0:== Symbol]]]].
			r := ([obj __str__] @env0:on: AbstractException do: [:ex | obj])
				@env0:___strResult___.
			"A kernel string is returned WITHOUT copying.  ___allocateStringLike___
			builds a string of the RECEIVER's class, so copying a wide
			Unicode16/32 (auto-promoted by content, not a user subclass) into the
			narrow canonical class would corrupt it."
			isKernelString ifTrue: [^ r].
			"A str SUBCLASS instance coerces DOWN to a genuine plain str --
			CPython's str(subclass_instance) is exactly str, never the subclass.
			Without it, FooStr.__float__ calling str(self) got back another
			FooStr and recursed forever (test_float test_floatconversion)."
			^ (r isKindOf: CharacterCollection)
				ifTrue: [self ___allocateStringLike___: r]
				ifFalse: [r]].
		^ ([obj __str__] @env0:on: MessageNotUnderstood do: [:ex | obj __repr__])
			@env0:___strResult___].

	obj @env0:ifNil: [source := ''].
	obj @env0:ifNotNil: [
		(obj isKindOf: CharacterCollection)
			ifTrue: [source := obj]
			ifFalse: [source := obj __str__ @env0:___strResult___].
	].
	"Allocate a self-typed string of the right size via Behavior's
	primitive ``new:`` and copy bytes.  Do NOT route through
	``___new___:`` here — Object's class-side bridge of that name
	dispatches back to env-1 ``__new__:``, which would re-enter this
	method via subclass instantiation and stack-overflow."
	result := self @env0:new: source @env0:size.
	source @env0:size @env0:> 0 ifTrue: [
		result
			@env0:replaceFrom: 1
			to: source @env0:size
			with: source
			startingAt: 1
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
___allocateStringLike___: source
	"A fresh string of the RECEIVER's class carrying source's characters.

	Split out of __new__: so the canonical ``str(obj)'' branch can coerce a
	subclass instance down to a plain str without re-entering __new__: -- which
	would take the canonical branch again and answer the subclass unchanged,
	defeating the coercion."

	| result |
	result := self @env0:new: source @env0:size.
	source @env0:size @env0:> 0 ifTrue: [
		result
			@env0:replaceFrom: 1
			to: source @env0:size
			with: source
			startingAt: 1].
	^ result
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj _: encoding
	"Create a str from a bytes-like ``obj'' by decoding under
	``encoding'' — the 2-arg form of Python's str() constructor.
	Werkzeug.http uses ``str(value, 'utf-8')'' to turn header
	bytes into text.  Delegates to bytes.decode for the actual
	conversion."

	"Also CPython's EXPLICIT-cls spelling ``str.__new__(cls, value)'', which a
	hand-written str-subclass __new__ uses to build its instance (test_bytes'
	StrWithBytes).  Grail models __new__ as a classmethod whose receiver is
	already the class, so the class arrives as the first POSITIONAL and shifts
	the real source into ``encoding'' -- without this the content was silently
	dropped and an empty instance came back.  Unambiguous: decoding a CLASS
	under an encoding is meaningless, so a str-subclass class here can only be
	the explicit-cls form.  (The 1-arg ``__new__: obj'' deliberately does NOT
	get this treatment -- ``str(SomeClass)'' must still stringify the class.)"
	"A StrEnum member class is AbstractPyStr-rooted, NOT CharacterCollection --
	it stores its string in the #value slot (basicNew + #value), not indexed
	chars, so the CharacterCollection raw-alloc below fails ('no varying
	instVars').  ``str.__new__(cls, value)'' for such an enum basicNews a cls
	instance carrying value in #value, else the member came back a bare
	Unicode7 (custom-__new__ instance attrs / __class__ lost -- StrEnum
	test_dir_on_sub)."
	[ | aps enumCls2 |
	aps := Python @env0:at: #AbstractPyStr otherwise: nil.
	enumCls2 := Python @env0:at: #Enum otherwise: nil.
	((obj @env0:isKindOf: Behavior)
		and: [(aps @env0:notNil) and: [(obj @env0:inheritsFrom: aps)
		and: [(obj @env0:inheritsFrom: CharacterCollection) @env0:not
		and: [(enumCls2 @env0:notNil)
			and: [(obj @env0:inheritsFrom: enumCls2)
				or: [(enumCls2 @env0:perform: #'___grailRecordFor:' env: 1
					withArguments: { obj }) @env0:notNil]]]]]])
		ifTrue: [ | src2 res2 |
			src2 := (encoding isKindOf: CharacterCollection)
				ifTrue: [encoding]
				ifFalse: [encoding @env0:ifNil: [''] ifNotNil: [encoding __str__]].
			res2 := obj @env0:new.
			res2 @env0:dynamicInstVarAt: #value put: src2.
			^ res2] ] @env0:value.
	((obj @env0:isKindOf: Behavior)
		@env0:and: [obj @env0:inheritsFrom: CharacterCollection])
			ifTrue: [
				| enumCls src res |
				enumCls := Python @env0:at: #Enum otherwise: nil.
				((enumCls @env0:notNil)
					and: [(obj @env0:inheritsFrom: enumCls)
						or: [(enumCls @env0:perform: #'___grailRecordFor:' env: 1
							withArguments: { obj }) @env0:notNil]])
					ifFalse: [^ obj __new__: encoding].
				src := (encoding isKindOf: CharacterCollection)
					ifTrue: [encoding]
					ifFalse: [encoding @env0:ifNil: [''] ifNotNil: [encoding __str__]].
				res := obj @env0:new: src @env0:size.
				src @env0:size @env0:> 0 ifTrue: [
					res @env0:replaceFrom: 1 to: src @env0:size with: src startingAt: 1].
				^ res].

	(obj isKindOf: ByteArray) ifTrue: [
		"CPython validates the decode arguments before decoding anything:
		``str() argument 'encoding' must be str, not builtin_function_or_method''.
		Grail handed whatever it was given straight to ``decode:'', which tried
		to iterate it -- so ``str(b'2', sys.getdefaultencoding)'' surfaced as a
		Smalltalk MessageNotUnderstood (``a BoundMethod does not understand
		#do:'') rather than a TypeError, and inside a class body that meant an
		enum definition failed with an internal error instead of the constructor
		complaint.  test_enum test_custom_strenum."
		(encoding isKindOf: CharacterCollection) ifFalse: [
			^ TypeError ___signal___: 'str() argument ''encoding'' must be str, not '
				@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: encoding)].
		"Re-wrap through the 1-arg SELF-TYPED allocator.  ``decode:''
		answers a plain string, so returning it directly dropped the
		subclass: ``Markup(b'x', 'ascii')'' decoded correctly but came
		back a bare ``str'' rather than a ``Markup''.  When self IS the
		canonical str class this is the same string, one copy later."
		^ self __new__: (obj decode: encoding)
	].
	obj @env0:___isPyStr___ ifTrue: [
		"CPython rejects str(str, encoding) with TypeError —
		``decoding str is not supported''.  Match the shape.  Asked as
		___isPyStr___ so a surrogate-bearing str gets the SAME complaint rather
		than falling through to ``__new__: obj'' and being stringified."
		TypeError ___signal___: 'decoding str is not supported'
	].
	^ self __new__: obj
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
__new__: obj _: encoding _: errors
	"3-arg form: ``str(bytes_obj, encoding, errors)''.  Errors policy
	is honored by bytes.decode (currently ignored — Grail's decoders
	either succeed or raise) — accepted for parity."

	"Explicit-cls spelling ``str.__new__(cls, value, encoding)'' -- see
	__new__:_: for why this is unambiguous."
	((obj @env0:isKindOf: Behavior)
		@env0:and: [obj @env0:inheritsFrom: CharacterCollection])
			ifTrue: [^ obj __new__: encoding _: errors].

	"``errors'' has its own complaint, and ``encoding'' is checked FIRST so that
	str(b'2', <not a str>, <not a str>) names the encoding, as CPython does.
	The delegation below re-checks encoding; doing it here as well is what keeps
	the two in that order."
	(obj isKindOf: ByteArray) ifTrue: [
		(encoding isKindOf: CharacterCollection) ifFalse: [
			^ TypeError ___signal___: 'str() argument ''encoding'' must be str, not '
				@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: encoding)].
		(errors isKindOf: CharacterCollection) ifFalse: [
			^ TypeError ___signal___: 'str() argument ''errors'' must be str, not '
				@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: errors)].
		"DECODE WITH THE POLICY.  This used to validate ``errors'' and then
		hand only the encoding on, so every policy behaved as strict:
		``str(b'a\xed\xa0\x80', 'utf-8', 'surrogatepass')'' raised, and
		test_codecs NameprepTest decodes its RFC 3454 vectors exactly that way.
		Re-wrapped through the 1-arg allocator for the reason __new__:_:
		gives (a str subclass must stay one)."
		^ self __new__: (obj decode: encoding _: errors)].

	^ self __new__: obj _: encoding
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
_new: positional kw: kwargs
	"``str(object='', encoding='utf-8', errors='strict')'' called with
	KEYWORDS, which the class-call dispatcher routes here.  A class with no
	``_new:kw:'' answers ``takes no keyword arguments'', which is what
	``str(b'x', errors='replace')'' used to raise.

	CPython's contract: any of the three may be a keyword; supplying
	``encoding'' OR ``errors'' means DECODE, with the other defaulted; and any
	other keyword is ``str() got an unexpected keyword argument'' -- the
	wording CPython 3.14 uses."

	| args obj encoding errors |
	args := OrderedCollection @env0:withAll: positional.
	kwargs @env0:keysDo: [:k |
		(#('object' 'encoding' 'errors') @env0:includes: k @env0:asString) ifFalse: [
			^ TypeError ___signal___: 'str() got an unexpected keyword argument '''
				@env0:, k @env0:asString @env0:, '''']].
	(kwargs @env0:includesKey: 'object') ifTrue: [
		args @env0:isEmpty ifFalse: [
			^ TypeError ___signal___: 'argument for str() given by name (''object'') and position (1)'].
		args @env0:add: (kwargs @env0:at: 'object')].
	obj := args @env0:isEmpty ifTrue: [''] ifFalse: [args @env0:at: 1].
	encoding := args @env0:size @env0:>= 2
		ifTrue: [args @env0:at: 2]
		ifFalse: [kwargs @env0:at: 'encoding' ifAbsent: [nil]].
	errors := args @env0:size @env0:>= 3
		ifTrue: [args @env0:at: 3]
		ifFalse: [kwargs @env0:at: 'errors' ifAbsent: [nil]].
	(encoding @env0:isNil @env0:and: [errors @env0:isNil]) ifTrue: [
		^ args @env0:isEmpty ifTrue: [self __new__] ifFalse: [self __new__: obj]].
	((obj @env0:isKindOf: ByteArray) @env0:or: [obj @env0:isKindOf: memoryview]) ifFalse: [
		^ TypeError ___signal___: 'decoding to str: need a bytes-like object, '
			@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: obj) @env0:asString
			@env0:, ' found'].
	(obj @env0:isKindOf: memoryview) ifTrue: [obj := obj tobytes].
	^ self __new__: obj
		_: (encoding @env0:ifNil: ['utf-8'])
		_: (errors @env0:ifNil: ['strict'])
%

category: 'Grail-Initialization'
classmethod: CharacterCollection
_str: positional kw: kwargs
	"Varargs entry for ``str(*args, **kwargs)'' so the Python call
	site dispatches through a single selector regardless of arity.
	Routes by positional count + optional encoding kwarg."

	| nargs encoding errors obj |
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self __new__].
	obj := positional @env0:at: 1.
	nargs @env0:= 1 ifTrue: [
		(kwargs @env0:isNil @env0:not
			and: [kwargs @env0:includesKey: 'encoding']) ifTrue: [
			^ self __new__: obj _: (kwargs @env0:at: 'encoding')
		].
		^ self __new__: obj
	].
	encoding := positional @env0:at: 2.
	nargs @env0:= 2 ifTrue: [^ self __new__: obj _: encoding].
	errors := positional @env0:at: 3.
	^ self __new__: obj _: encoding _: errors
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
___maketransKey___: aKey
	"One key of a maketrans table, as the CODEPOINT that ``translate:'' looks up.
	CPython accepts either an int codepoint or a one-character string."

	| cps |
	(aKey @env0:isKindOf: Integer) ifTrue: [^ aKey].
	"Through the shared code-point accessor, so a one-character key works for
	every str representation -- a StrEnum member and a lone surrogate alike."
	cps := aKey @env0:___pyCodePoints___.
	(cps @env0:notNil @env0:and: [cps @env0:size @env0:= 1])
		ifTrue: [^ cps @env0:at: 1].
	^ TypeError ___signal___:
		'string keys in translate table must be of length 1'
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
maketrans: x
	"str.maketrans(dict) -- the ONE-argument form: a mapping whose keys are
	either one-character strings or integer codepoints.

	The answer is keyed by CODEPOINT, because that is what ``translate:'' looks
	up: it walks the receiver and asks the table for each character's code point.

	There used to be no working arity at all.  The only ``maketrans'' here was a
	unary stub that raised ``Not yet implemented'', so every CPython spelling --
	one, two or three arguments -- failed; wcwidth and humanize each call the
	two-argument form at import time, and it was the first error both hit."

	| out |
	(x @env0:isKindOf: AbstractDictionary) ifFalse: [
		^ TypeError ___signal___:
			'if you give only one argument to maketrans it must be a dict'].
	out := dict ___new___.
	x @env0:keysAndValuesDo: [:k :v |
		out @env0:at: (self ___maketransKey___: k) put: v].
	^ out
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
maketrans: x _: y
	"str.maketrans(frm, to) -- two equal-length strings, character for
	character.  The values are CODEPOINTS, as CPython's are, not one-character
	strings; ``translate:'' accepts either."

	| out xc yc |
	"Both sides through ___pyCodePoints___: the table is keyed and valued by
	CODE POINT, which is the one thing every str representation can supply --
	``str.maketrans('\\udc80', 'x')'' used to raise ``maketrans arguments must
	be strings'' about two strings."
	xc := x @env0:___pyCodePoints___.
	yc := y @env0:___pyCodePoints___.
	(xc @env0:isNil @env0:or: [yc @env0:isNil]) ifTrue: [
		^ TypeError ___signal___: 'maketrans arguments must be strings'].
	(xc @env0:size @env0:= yc @env0:size) ifFalse: [
		^ ValueError ___signal___:
			'the first two maketrans arguments must have equal length'].
	out := dict ___new___.
	1 @env0:to: xc @env0:size do: [:i |
		out @env0:at: (xc @env0:at: i) put: (yc @env0:at: i)].
	^ out
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
maketrans: x _: y _: z
	"str.maketrans(frm, to, delete) -- as the two-argument form, plus every
	character of ``delete'' mapped to None, which ``translate:'' drops.

	``delete'' is applied AFTER the pairwise mapping, so a character named in
	both is deleted rather than replaced -- CPython's order, and the one the
	documented ``remove these characters'' idiom depends on."

	| out zc |
	out := self maketrans: x _: y.
	zc := z @env0:___pyCodePoints___.
	zc @env0:isNil ifTrue: [
		^ TypeError ___signal___: 'maketrans arguments must be strings'].
	zc @env0:do: [:cp | out @env0:at: cp put: None].
	^ out
%

category: 'Grail-String Methods'
classmethod: CharacterCollection
_maketrans: positional kw: kwargs
	"Varargs entry for ``maketrans(x[, y[, z]])''.  Grail's call dispatch probes
	this shape first, so the per-arity selectors above are only reached through
	it for a call written in Python.

	CLASS SIDE ONLY, and that is a measured decision rather than an omission.
	CPython's str.maketrans is a STATICMETHOD, so an instance reaches it too, and
	Grail has no staticmethod: directive for hand-written methods (see
	bytes>>maketrans:_:).  Adding delegating INSTANCE-side methods to cover the
	``'abc'.maketrans(...)'' spelling made things WORSE, not better: Grail then
	resolved ``str.maketrans(x)'' as an unbound instance method and bound x as the
	RECEIVER, so humanize's one-argument call arrived here with zero positional
	arguments and wcwidth's ``str.maketrans('', '', chars)'' arrived as the
	two-argument form with mismatched lengths.  The class-side spelling is the one
	real callers use; the instance-side spelling is deliberately not offered."

	| n |
	n := positional @env0:size.
	n @env0:= 1 ifTrue: [^ self maketrans: (positional @env0:at: 1)].
	n @env0:= 2 ifTrue: [
		^ self maketrans: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	n @env0:= 3 ifTrue: [
		^ self maketrans: (positional @env0:at: 1)
			_: (positional @env0:at: 2)
			_: (positional @env0:at: 3)].
	^ TypeError ___signal___:
		(('maketrans() takes 1, 2, or 3 arguments (' @env0:, (n @env0:printString))
			@env0:, ' given)')
%


category: 'Grail-String Operations'
method: CharacterCollection
__add__: other
	"Concatenate two strings. In Python: str1 + str2"

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ __add__: other].
	(other isKindOf: CharacterCollection) ifTrue: [^ self @env0:, other].
	"An EXACT str in the other representation concatenates here rather than
	via the reflected __radd__: -- see object >> ___isExactPyStr___ for why a
	str SUBCLASS instance must keep going to the fallback instead."
	other @env0:___isExactPyStr___ ifTrue: [
		^ PyStrSurrogate @env0:___concat___: self with: other].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__contains__: item
	"Test if item is in string (Python: item in str).  MUST be case-SENSITIVE:
	GemStone's includesString: uses the Unicode collation and is
	case-INSENSITIVE under enableUnicodeComparisonMode (''e'' matches ''E''),
	which violates Python semantics -- e.g. ``'e' in 'EFG'`` is False.  Scan by
	CODEPOINT (mode-independent), mirroring ___codePointCompare___."

	| sn subn last plain |
	item @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: ('''in <string>'' requires string as left operand, not '
			@env0:, item @env0:class @env0:name @env0:asString)].
	"A needle in the OTHER representation cannot be walked with ``at:'' /
	``codePoint'', so route it through the shared code-point search.  This is
	the operation the whole surrogate-str protocol was blocked on: ``s in
	'abc''' raised TypeError where CPython answers False."
	plain := item @env0:___pyPlainStr___.
	plain @env0:== nil ifTrue: [
		^ (PyStrSurrogate @env0:___indexOf___: item in: self from: 1) @env0:> 0].
	"Scan against the PLAIN string, not the box: an AbstractPyStr (a StrEnum
	member, a ``class X(str)'' instance) understands neither env-0 ``at:'' nor
	``size'', so walking ``item'' directly worked for kernel strings only."
	subn := plain @env0:size.
	subn @env0:= 0 ifTrue: [^ true].
	sn := self @env0:size.
	last := sn @env0:- subn @env0:+ 1.
	1 @env0:to: last do: [:i |
		| match |
		match := true.
		1 @env0:to: subn do: [:j |
			(((self @env0:at: (i @env0:+ j @env0:- 1)) @env0:codePoint)
				@env0:= ((plain @env0:at: j) @env0:codePoint)) ifFalse: [match := false]].
		match ifTrue: [^ true]].
	^ false
%

category: 'Grail-Comparison'
method: CharacterCollection
__eq__: other
	"Return self == other.

	A NON-string operand is not simply unequal: CPython's str.__eq__ answers
	NotImplemented so the REFLECTED __eq__ on the other side gets its turn
	(``'a' == ALWAYS_EQ'' is True throughout CPython's suite, and
	``'a' == UserString('a')'' relies on the same hand-off).  ___cmpEq___ ->
	___eqValue___ still ends at identity/False when that operand has no
	__eq__ of its own, so plain ``'a' == 1'' is unchanged.

	Two strings are compared by CODEPOINT, not by GemStone's ``='', for the
	same reason __lt__ and __contains__ already are: under
	enableUnicodeComparisonMode ``='' is an ICU COLLATION, which treats the C0
	control characters as ignorable and therefore EQUAL to one another.
	``'\x01' == '\x00''' was True, and so was ``'ab\x00' == 'ab\x01''' --
	difflib marks intraline changes with exactly those two sentinels, so its
	line-wrapping state machine could not tell a start marker from an end one
	(test_difflib's wrapcolumn cases).  CPython's str equality is exact."

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:= 0].
	"An EXACT str in the OTHER representation is settled here too, through the
	shared code-point comparison -- GemStone's collation cannot see a
	PyStrSurrogate at all, and the reflected dunder used to be the only route,
	which for ordering meant no route: ``'abc' < '\\ud800''' raised TypeError
	where CPython answers True.  A str SUBCLASS instance keeps going to the
	fallback so a user-written override wins -- object >> ___isExactPyStr___."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:= 0].
	^ NotImplemented
%

category: 'Grail-String Representation'
method: CharacterCollection
__format__: formatSpec
	"Python str.__format__: full fill/align/width plus .precision
	truncation and the 's' type — see the shared engine in builtins
	___formatValue___:spec:."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ __format__: formatSpec].
	(formatSpec @env0:isNil or: [formatSpec @env0:= '']) ifTrue: [^ self].
	^ (builtins instance) ___formatValue___: self spec: formatSpec
%

category: 'Grail-Comparison'
method: CharacterCollection
___codePointCompare___: other
	"Three-way lexicographic comparison by Unicode CODEPOINT — Python's
	string ordering.  GemStone's <, <=, >, >= use the Unicode collation
	(case-insensitive: 'Caller' sorts before 'CallSid'), which breaks
	order-sensitive Python output — twilio.request_validator's HMAC
	input is the params concatenated in sorted() order, so collation
	ordering produced a wrong signature.  Returns -1, 0, or 1."

	| n1 n2 lim c1 c2 |
	n1 := self @env0:size.
	n2 := other @env0:size.
	lim := n1 @env0:min: n2.
	1 @env0:to: lim do: [:i |
		c1 := (self @env0:at: i) @env0:codePoint.
		c2 := (other @env0:at: i) @env0:codePoint.
		c1 @env0:< c2 ifTrue: [^ -1].
		c1 @env0:> c2 ifTrue: [^ 1]].
	n1 @env0:< n2 ifTrue: [^ -1].
	n1 @env0:> n2 ifTrue: [^ 1].
	^ 0
%

category: 'Grail-Comparison'
method: CharacterCollection
__ge__: other
	"Return self >= other (codepoint order for strings)"

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:>= 0
	].
	"An EXACT str in the OTHER representation is settled here too, through the
	shared code-point comparison -- GemStone's collation cannot see a
	PyStrSurrogate at all, and the reflected dunder used to be the only route,
	which for ordering meant no route: ``'abc' < '\\ud800''' raised TypeError
	where CPython answers True.  A str SUBCLASS instance keeps going to the
	fallback so a user-written override wins -- object >> ___isExactPyStr___."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:>= 0].
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__getitem__: index
	"Get character at index, or a substring for slice indices.
	Returns a single-character string for integer indices.
	Supports negative indices (counting from end)."

	| size idx char charString |
	(index isKindOf: slice) ifTrue: [
		^ self ___getslice___: index start
			_: index stop
			_: index step
	].
	"Non-integer, non-slice index: catchable TypeError instead of an
	uncatchable env-0 comparison DNU on the index."
	((index isKindOf: Integer)
		or: [index ___hasIndexDunder___]) ifFalse: [
		"str is the ONE sequence whose wording differs: CPython QUOTES the
		type name here and does not elsewhere, and it says ``must be
		integers'' rather than ``must be integers or slices''.

		    list indices must be integers or slices, not N
		    string indices must be integers, not 'N'

		Grail matched list, tuple and bytes exactly and dropped the quotes
		on this one."
		"PYTHON type name, through ___pyTypeNameForError___: ``index class name''
		is the GEMSTONE class backing the value, so this message read ``not
		Unicode7'' for a str key, ``not SmallDouble'' for a float and ``not
		ByteArray'' for bytes, where CPython says str / float / bytes.  Bytes.gs
		and Bytearray.gs already named the type properly; these sites did not."
		TypeError ___signal___: ('string indices must be integers, not '''
			@env0:, (index ___pyTypeNameForError___) @env0:, '''')].
	"Fetch the index via __index__ -- probing only proved it is index-like
	(test_index.StringTestCase; env-0 #< on the object is an uncatchable DNU)."
	idx := index ___asIndex___.
	size := self @env0:size.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'string index out of range'
	].

	"Get character at 1-based Smalltalk index"
	char := self @env0:at: (idx @env0:+ 1).

	"Convert character to a single-character string"
	charString := Unicode7 ___new___: 1.
	charString @env0:at: 1 put: char.

	^ charString
%

category: 'Grail-Comparison'
method: CharacterCollection
__gt__: other
	"Return self > other (codepoint order for strings)"

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:> 0
	].
	"An EXACT str in the OTHER representation is settled here too, through the
	shared code-point comparison -- GemStone's collation cannot see a
	PyStrSurrogate at all, and the reflected dunder used to be the only route,
	which for ordering meant no route: ``'abc' < '\\ud800''' raised TypeError
	where CPython answers True.  A str SUBCLASS instance keeps going to the
	fallback so a user-written override wins -- object >> ___isExactPyStr___."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:> 0].
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
%

category: 'Grail-Hashing & Identity'
method: CharacterCollection
__hash__
	"Return hash value for this string"

	^ self @env0:hash
%

category: 'Grail-Initialization'
method: CharacterCollection
__init__: obj
	"Initialize a str instance (called after __new__).
	Default implementation does nothing since __new__ handles everything."

	^ None
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__iter__
	"Return an iterator over the string characters."

	^ str_iterator ___on: self
%

category: 'Grail-Comparison'
method: CharacterCollection
__le__: other
	"Return self <= other (codepoint order for strings)"

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:<= 0
	].
	"An EXACT str in the OTHER representation is settled here too, through the
	shared code-point comparison -- GemStone's collation cannot see a
	PyStrSurrogate at all, and the reflected dunder used to be the only route,
	which for ordering meant no route: ``'abc' < '\\ud800''' raised TypeError
	where CPython answers True.  A str SUBCLASS instance keeps going to the
	fallback so a user-written override wins -- object >> ___isExactPyStr___."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:<= 0].
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'
%

category: 'Grail-Sequence Operations'
method: CharacterCollection
__len__
	"Return the length of the string. In Python: len(str)"

	^ self @env0:size
%

category: 'Grail-Comparison'
method: CharacterCollection
__lt__: other
	"Return self < other (codepoint order for strings)"

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:< 0
	].
	"An EXACT str in the OTHER representation is settled here too, through the
	shared code-point comparison -- GemStone's collation cannot see a
	PyStrSurrogate at all, and the reflected dunder used to be the only route,
	which for ordering meant no route: ``'abc' < '\\ud800''' raised TypeError
	where CPython answers True.  A str SUBCLASS instance keeps going to the
	fallback so a user-written override wins -- object >> ___isExactPyStr___."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:< 0].
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-String Operations'
method: CharacterCollection
__mod__: args
	"printf-style % formatting: '%[(key)][flags][width][.precision][len]conv'
	% args.  Flags - + space # 0, width and precision (each a number or '*'
	that consumes an argument), and conversions s r a c d i u o x X e E f F
	g G % are supported.  Mapping form '%(key)s' indexes args as a dict;
	sequence form '%s %d' consumes positionally.  Width/precision/padding/
	sign handling is shared with the str.format() engine
	(builtins>>___printfConvert___:...)."

	| stream src n i ch isMap argSeq argIdx bi nextArg |
	src := self @env0:asString.
	n := src @env0:size.
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	bi := builtins instance.
	isMap := args isKindOf: KeyValueDictionary.
	"Python treats a string on the RHS as a single positional, not a
	sequence of characters; same for ByteArray.

	Only a TUPLE is unpacked into positional arguments.  A LIST is a single
	value -- ``'%s' % [1, 2]'' is the string '[1, 2]' -- but Grail also
	unpacked OrderedCollection (which is how it represents a Python list), so
	that formatted just the FIRST element and silently dropped the rest.  The
	newly-added ``not all arguments converted'' check is what surfaced it.
	tuple is an Array subclass, so the Array test covers tuples and the plain
	Arrays Grail's own call sites build."
	"A MAPPING is ALSO a single positional value, which is the half this used
	to get backwards.  CPython keys the two roles off different things: the
	mapping is kept for ``%(name)s'' lookups, AND, because the right operand
	is not a tuple, the positional cursor starts one before the single value
	``args'' itself -- so an UNKEYED specifier consumes the mapping, exactly
	once.  ``'%s' % {}'' is therefore '{}' and ``'%s' % {'a': 1}'' is
	""{'a': 1}"", where Grail raised ``format requires a mapping'' for both.
	A second unkeyed specifier then finds the cursor spent and gets ``not
	enough arguments for format string'', which falls out of the size test
	below rather than needing its own case."
	(isMap not @env0:and: [args isKindOf: Array]) ifTrue: [argSeq := args]
	ifFalse: [argSeq := Array @env0:with: args].
	argIdx := 1.
	"Pull the next positional argument (also used by '*' width/precision)."
	nextArg := [ | v |
		argIdx @env0:> argSeq @env0:size ifTrue: [
			TypeError ___signal___: 'not enough arguments for format string' ].
		v := argSeq @env0:at: argIdx.
		argIdx := argIdx @env0:+ 1.
		v ].
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		ch := src @env0:at: i.
		ch @env0:= $% ifFalse: [
			stream @env0:nextPut: ch.
			i := i @env0:+ 1
		] ifTrue: [
			| key flags width precision conv value |
			i := i @env0:+ 1.
			i @env0:> n ifTrue: [
				ValueError ___signal___: 'incomplete format'
			].
			key := nil.
			"Optional mapping key '(name)' -- see ___printfKeyEnd___:from:."
			(src @env0:at: i) @env0:= $( ifTrue: [
				| keyStart keyEnd |
				keyStart := i @env0:+ 1.
				keyEnd := self ___printfKeyEnd___: src from: keyStart.
				key := src @env0:copyFrom: keyStart to: keyEnd @env0:- 1.
				i := keyEnd @env0:+ 1
			].
			"Flags: - + space # 0 (any order, repeatable)."
			flags := OrderedCollection @env0:new.
			[i @env0:<= n @env0:and: [ | c |
				c := src @env0:at: i.
				(c @env0:= $-) @env0:or: [(c @env0:= $+) @env0:or: [
					(c @env0:= Character @env0:space) @env0:or: [
						(c @env0:= $#) @env0:or: [c @env0:= $0]]]] ]]
				@env0:whileTrue: [ flags @env0:add: (src @env0:at: i). i := i @env0:+ 1 ].
			"Width: digits or '*' (consumes an argument; negative -> '-' flag)."
			width := 0.
			(i @env0:<= n @env0:and: [(src @env0:at: i) @env0:= $*]) ifTrue: [
				width := self ___printfStarArg___: nextArg @env0:value.
				width @env0:< 0 ifTrue: [ flags @env0:add: $-. width := width @env0:abs ].
				i := i @env0:+ 1
			] ifFalse: [
				[i @env0:<= n @env0:and: [(src @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
					width := (width @env0:* 10) @env0:+ (src @env0:at: i) @env0:digitValue.
					i := i @env0:+ 1 ].
				"CPython reads a literal width into a Py_ssize_t and refuses one
				that overflows it (``'%18446744073709551616f''); Grail's Integer
				would go on to build a result that wide.  Grail's Py_ssize_t is
				the SmallInteger range -- it is what sys.maxsize reports."
				width @env0:> SmallInteger @env0:maximumValue ifTrue: [
					ValueError ___signal___: 'width too big']
			].
			"Precision: '.' then digits or '*' ('.' alone means 0)."
			precision := nil.
			(i @env0:<= n @env0:and: [(src @env0:at: i) @env0:= $.]) ifTrue: [
				i := i @env0:+ 1.
				(i @env0:<= n @env0:and: [(src @env0:at: i) @env0:= $*]) ifTrue: [
					precision := self ___printfStarArg___: nextArg @env0:value.
					precision @env0:< 0 ifTrue: [precision := nil].
					i := i @env0:+ 1
				] ifFalse: [
					precision := 0.
					[i @env0:<= n @env0:and: [(src @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
						precision := (precision @env0:* 10) @env0:+ (src @env0:at: i) @env0:digitValue.
						i := i @env0:+ 1 ].
					"A LITERAL precision past a C int is ValueError; the '*' form
					below is OverflowError -- see the next comment."
					precision @env0:> 2147483647 ifTrue: [
						ValueError ___signal___: 'precision too big']
				].
				"CPython keeps the precision in a C int and validates it; Grail's is
				an arbitrary-precision Integer, so ``'%.*d' % (sys.maxsize, 1)''
				went on to build a sys.maxsize-digit result and hung or died on an
				UNCATCHABLE NumericError -- which is why that test was skip-listed.

				OverflowError, NOT ValueError: the %-format path and the
				format-spec path disagree in CPython, and test_format pins both.
				test_common_format passes ``overflowok=True'' and its helper catches
				only OverflowError, while test_precision's format(f, '.<huge>f')
				wants ValueError (raised by the format-spec engine)."
				(precision @env0:notNil @env0:and: [precision @env0:> 2147483647])
					ifTrue: [OverflowError ___signal___: 'precision too large']
			].
			"Skip C length modifiers (h l L) -- Python ignores them."
			[i @env0:<= n @env0:and: [ | c |
				c := src @env0:at: i.
				(c @env0:= $h) @env0:or: [(c @env0:= $l) @env0:or: [c @env0:= $L]] ]]
				@env0:whileTrue: [i := i @env0:+ 1].
			i @env0:> n ifTrue: [
				ValueError ___signal___: 'incomplete format'
			].
			conv := src @env0:at: i.
			i := i @env0:+ 1.
			conv @env0:= $% ifTrue: [stream @env0:nextPut: $%]
			ifFalse: [
				"Reject an unknown conversion HERE, not deep inside the
				converter: CPython's message carries the character, its hex
				code AND its 0-based index in the format string
				(``unsupported format character 'b' (0x62) at index 5''), and
				only this loop knows the index.  conv sits at ``i - 1'' now
				that i has advanced, so its 0-based index is ``i - 2''."
				(bi ___isPrintfConversion___: conv) ifFalse: [
					ValueError ___signal___: ('unsupported format character '''
						@env0:, (String @env0:with: conv) @env0:, ''' (0x'
						@env0:, ((conv @env0:codePoint) @env0:printStringRadix: 16
							showRadix: false) @env0:asLowercase
						@env0:, ') at index ' @env0:, (i @env0:- 2) @env0:printString)].
				key @env0:notNil
					ifTrue: [
						"``format requires a mapping'' belongs HERE -- it is what
						CPython raises when a KEYED specifier meets a right operand
						that is not a mapping, not (as Grail had it) when an unkeyed
						one meets a mapping.  Without this the lookup below reaches
						``at:'' on whatever was passed: ``'%(a)s' % [1]'' took an
						UNCATCHABLE ArgumentTypeError (error 2283) out of
						OrderedCollection, where CPython raises a TypeError the
						caller can handle."
						isMap ifFalse: [
							TypeError ___signal___: 'format requires a mapping'].
						"The key is read with PYTHON's item protocol, as bytes'
						__mod__: does.  A Smalltalk at: on a missing key raised an
						UNCATCHABLE LookupError (error 2021) that no except clause
						could see, so ``'%(x)s' % {}'' ended the program where CPython
						raises KeyError -- and so did every logging Formatter whose
						format named a field the record lacked, which is how any
						Flask view that raised took the server down (#1220, #1221).
						__getitem__ also honours __missing__ and defaultdict."
						value := args @env1:__getitem__: key]
					ifFalse: [value := nextArg @env0:value].
				stream @env0:nextPutAll: (bi ___printfConvert___: value conv: conv
					flags: flags width: width precision: precision)
			]
		]
	].
	"Every positional argument must be consumed -- ``'no format' % '1''' is a
	TypeError in CPython, where Grail silently returned the format string and
	dropped the argument.  Only the SEQUENCE form is checked: with a mapping
	on the right, unreferenced keys are fine (``'%(a)s' % {'a': 1, 'b': 2}''),
	and so is a mapping no specifier reads at all (``'no format' % {}'').  So
	the test is on isMap, not on whether the cursor was spent: a mapping now
	also sits in argSeq as a single positional, and reading that size here
	would make the untouched-mapping case a spurious TypeError."
	(isMap @env0:not @env0:and: [argIdx @env0:<= argSeq @env0:size]) ifTrue: [
		TypeError ___signal___:
			'not all arguments converted during string formatting'].
	^ stream @env0:contents
%

category: 'Grail-String Operations'
method: CharacterCollection
___printfKeyEnd___: src from: keyStart
	"The index of the ')' closing a %-format mapping key that starts at
	``keyStart''.  Parentheses inside the key NEST, as in CPython:
	``'%((foo))s' % {'(foo)': 'bar'}'' reads the key '(foo)'.  Stopping at
	the first ')' read the key '(foo' and then choked on the stray ')' as a
	conversion character.  An unclosed key is ValueError.

	A separate method rather than inline in __mod__: on purpose.  Every level
	of a recursive repr (``e.tag = e; repr(e)'') holds a __mod__ activation,
	and growing that frame moved test_xml_etree's test_recursive_repr onto a
	stack alignment where the VM re-trips while resignalling the
	RecursionError (see ___recursionGuard___), so the error escaped its
	``except''.  Keeping the scan out of __mod__ keeps its frame as it was."

	| n keyEnd depth |
	n := src @env0:size.
	keyEnd := keyStart.
	depth := 1.
	[keyEnd @env0:<= n and: [
		(src @env0:at: keyEnd) @env0:= $( ifTrue: [depth := depth @env0:+ 1].
		(src @env0:at: keyEnd) @env0:= $) ifTrue: [depth := depth @env0:- 1].
		depth @env0:> 0]]
		whileTrue: [keyEnd := keyEnd @env0:+ 1].
	depth @env0:> 0 ifTrue: [
		^ ValueError ___signal___: 'incomplete format key'].
	^ keyEnd
%

category: 'Grail-String Operations'
method: CharacterCollection
___printfStarArg___: value
	"The argument a '*' width or precision consumes.  It must be an int --
	CPython's ``* wants int'' TypeError.  ``asInteger'' accepted a str by
	PARSING it, and for one that is not a number (``'%*s' % ('foo', 'bar')'')
	raised an ImproperOperation no ``except'' can catch.  A '*' argument too
	big for a Py_ssize_t (in Grail, a SmallInteger -- sys.maxsize) is
	OverflowError, as in CPython.  bool is an int."

	value == true ifTrue: [^ 1].
	value == false ifTrue: [^ 0].
	(value @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: '* wants int'].
	(value @env0:isKindOf: SmallInteger) ifFalse: [
		^ OverflowError ___signal___: 'Python int too large to convert to C ssize_t'].
	^ value
%

category: 'Grail-String Operations'
method: CharacterCollection
___convert___: value with: conv
	"Format `value` per the printf conversion character.  Width and
	precision specifiers are ignored; just produce the bare rendering."

	conv @env0:= $s ifTrue: [^ value @env0:asString].
	"Python __repr__, NOT Smalltalk printString: printString only
	doubles embedded quotes, but %r must escape control characters
	the way repr() does (e.g. a NUL byte -> the 4 chars '\x00', not a
	raw NUL) -- test_int.py's test_error_message compares against
	'%r' % ('123\x00',) verbatim."
	conv @env0:= $r ifTrue: [^ value __repr__].
	(conv @env0:= $d @env0:or: [conv @env0:= $i]) ifTrue: [^ value @env0:asInteger @env0:printString].
	conv @env0:= $f ifTrue: [^ value @env0:asFloat @env0:printString].
	conv @env0:= $x ifTrue: [
		| digits n s |
		digits := '0123456789abcdef'.
		n := value @env0:asInteger.
		n @env0:= 0 ifTrue: [^ '0'].
		s := Unicode7 @env0:new.
		[n @env0:> 0] @env0:whileTrue: [
			s := (Unicode7 @env0:with: (digits @env0:at: (n @env0:bitAnd: 15) @env0:+ 1)) @env0:, s.
			n := n @env0:bitShift: -4
		].
		^ s
	].
	conv @env0:= $X ifTrue: [^ (self ___convert___: value with: $x) @env0:asUppercase].
	conv @env0:= $c ifTrue: [
		"%c — an int is a code point; a 1-char string passes through."
		(value isKindOf: Integer) ifTrue: [
			^ Unicode7 @env0:with: (Character @env0:codePoint: value)].
		^ value @env0:asString
	].
	conv @env0:= $o ifTrue: [
		| n s |
		n := value @env0:asInteger.
		n @env0:= 0 ifTrue: [^ '0'].
		s := Unicode7 @env0:new.
		[n @env0:> 0] @env0:whileTrue: [
			s := (Unicode7 @env0:with: (Character @env0:codePoint: (n @env0:bitAnd: 7) @env0:+ $0 @env0:asInteger)) @env0:, s.
			n := n @env0:bitShift: -3
		].
		^ s
	].
	^ value @env0:asString
%

category: 'Grail-String Operations'
method: CharacterCollection
__mul__: n
	"Repeat string n times. In Python: str * n"

	| count result stream |
	((n isKindOf: Integer)
		or: [n ___hasIndexDunder___]) ifFalse: [
		^ self ___binOpFallback___: n op: '*' reflected: #'__rmul__:'].
	"__index__ objects answer neither #asInteger (uncatchable DNU) nor
	arithmetic -- fetch the count first, range-checked: 'a' * 2**100 is an
	OverflowError, not an attempt to build it."
	count := n ___asRepeatCount___.
	(count @env0:<= 0) ifTrue: [ ^ '' @env0:copy ].

	stream := AppendStream @env0:on: (Unicode7 ___new___).
	count @env0:timesRepeat: [
		stream @env0:nextPutAll: self
	].
	result := stream @env0:contents.
	^ result
%

category: 'Grail-Comparison'
method: CharacterCollection
__ne__: other
	"Return self != other.

	Mirror __eq__:'s NotImplemented punt for a non-string operand -- deciding
	it here by Smalltalk ~= would skip the reflected __ne__/__eq__ that
	___cmpNe___ -> ___neValue___ is there to try."

	(other isKindOf: CharacterCollection) ifTrue: [
		^ (self ___codePointCompare___: other) @env0:~= 0].
	"See __eq__: for why an exact str settles here and a subclass does not."
	other @env0:___isExactPyStr___ ifTrue: [
		^ (PyStrSurrogate @env0:___compare___: self with: other) @env0:~= 0].
	^ NotImplemented
%

category: 'Grail-String Representation'
method: CharacterCollection
__repr__
	"Return a string representation for debugging. In Python: repr(str).
	CPython unicode_repr uses single quotes by default, switching to double
	quotes when the string contains a single quote but no double quote, so the
	delimiter need not be backslash-escaped (test_re test_quotes)."

	| stream quote quoteCp hasSingle hasDouble |
	hasSingle := false.
	hasDouble := false.
	self @env0:do: [:char | | cp |
		cp := char @env0:codePoint.
		cp == 39 ifTrue: [ hasSingle := true ].
		cp == 34 ifTrue: [ hasDouble := true ]].
	quote := (hasSingle and: [hasDouble @env0:not]) ifTrue: [$"] ifFalse: [$'].
	quoteCp := quote @env0:codePoint.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: quote.
	self @env0:do: [:char |
		self ___pyReprEscapeCodePoint___: char @env0:codePoint
			quote: quoteCp on: stream].
	stream @env0:nextPut: quote.
	^ stream @env0:contents
%

category: 'Grail-String Operations'
method: CharacterCollection
__rmod__: other
	"CPython's ``str.__rmod__(self, other)'' is ``other % self'': OTHER is the
	printf template and SELF the argument.  For a left operand that is not a
	string it answers NotImplemented, and that NotImplemented is the whole
	story for the operator, which only reaches a reflected slot after the LEFT
	operand's __mod__ has declined:

	    Decimal('2') % 'a'
	    TypeError: unsupported operand type(s) for %: 'Decimal' and 'str'

	This method was ``self error: 'Not yet implemented: __rmod__'''.  A raw
	Smalltalk error is invisible to Python's ``except'', so that expression did
	not raise -- it TOOK THE PROCESS DOWN, where CPython answers with a
	catchable TypeError.  §9.10's argument applies (a wrong-but-catchable
	failure is recoverable, an uncatchable one is not), and here the catchable
	answer is also the conformant one, so nothing is traded away.

	The string case delegates to __mod__:, which is real printf -- reachable
	only by calling the dunder directly (``'a'.__rmod__('%s!')''), since two
	strings never get past str.__mod__."

	(other @env0:isKindOf: CharacterCollection) ifFalse: [^ NotImplemented].
	^ other __mod__: self
%

category: 'Grail-String Operations'
method: CharacterCollection
__rmul__: n
	"Repeat string n times (reverse). In Python: n * str"

	^ self __mul__: n
%

category: 'Grail-String Representation'
method: CharacterCollection
__str__
	"Return a string representation for display. In Python: str(obj)"

	^ self ___asExactStr___
%

category: 'Grail-String Methods'
method: CharacterCollection
___asExactStr___
	"The receiver as a genuine str: itself when it already is one, else a
	kernel string carrying the same characters.

	CPython's str methods answer exact str for a subclass instance --
	``S('a').upper()'', ``S(' a').strip()'', ``S('a') + 'b''', even a no-op
	``S('a').strip()'' -- because they build from the characters, never from
	type(self).  The kernel primitives these methods use (copyFrom:to:, ``,'',
	copyEmpty, copyReplaceAll:with:, asLowercase) keep the RECEIVER's class,
	so each result-producing method narrows its receiver here first and
	re-sends.  An exact str pays one class test.  Slicing narrows through
	SequenceableCollection >> ___getslice___ instead.

	A str subclass is a Unicode32 subclass (importlib ___widenStrBase___:),
	so the copy goes through Unicode7, which the kernel widens only as far
	as the content needs -- the representation a plain str with these
	characters would have."

	self @env0:___isExactPyStr___ ifTrue: [^ self].
	^ Unicode7 ___allocateStringLike___: self
%

category: 'Grail-String Methods'
method: CharacterCollection
capitalize
	"Return a copy of the string with its first character capitalized and the rest lowercased."

	| stream first rest |
	(self @env0:isEmpty) ifTrue: [ ^ self ].

	stream := AppendStream @env0:on: (Unicode7 ___new___).
	first := self @env0:first.
	rest := self @env0:allButFirst.

	stream @env0:nextPut: (first @env0:asUppercase).
	stream @env0:nextPutAll: (rest @env0:asLowercase).

	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
casefold
	"Return a casefolded copy of the string. Similar to lowercase but more aggressive."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ casefold].
	^ self @env0:asLowercase
%

category: 'Grail-String Methods'
method: CharacterCollection
center: width
	"str.center(width) -- centered in a field of the given width, padded with
	spaces.  center(width, fillchar) supplies a different fill."

	^ self ___padCentered___: width fill: $ 
%

category: 'Grail-String Methods'
method: CharacterCollection
center: width _: fillchar
	"str.center(width, fillchar).  The two-argument form did not exist, so
	every call raised ``center() takes a different number of arguments'' --
	which is what kept CPython's test_decimal from importing at all."

	^ self ___padCentered___: width fill: (self ___fillCharacterOf___: fillchar)
%

category: 'Grail-String Methods'
method: CharacterCollection
___fillCharacterOf___: fillchar
	"The single Character a fill argument denotes.

	CPython requires EXACTLY ONE character and says so in the message; an
	empty or multi-character fill is a TypeError, not a silent truncation."

	| str |
	str := [fillchar @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(str @env0:notNil and: [str @env0:size @env0:= 1]) ifFalse: [
		^ TypeError ___signal___:
			'The fill character must be exactly one character long'].
	^ str @env0:at: 1
%

category: 'Grail-String Methods'
method: CharacterCollection
___padCentered___: width fill: aCharacter
	"Centering, with CPython's split for an ODD margin.

	    left = marg // 2 + (marg & width & 1)

	It is not simply ``marg // 2''.  When the margin AND the width are both
	odd the extra character goes on the LEFT, so ``'ab'.center(7, '*')'' is
	'***ab**' and not '**ab***' -- Grail answered the latter, and had done
	since before the two-argument form existed, invisibly, because the
	one-argument form pads with spaces and nobody counts spaces."

	| mySize marg leftPad rightPad stream |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ ___padCentered___: width fill: aCharacter].
	mySize := self @env0:size.
	width @env0:<= mySize ifTrue: [^ self].
	marg := width @env0:- mySize.
	leftPad := (marg @env0:// 2)
		@env0:+ ((marg @env0:bitAnd: width) @env0:bitAnd: 1).
	rightPad := marg @env0:- leftPad.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	leftPad @env0:timesRepeat: [stream @env0:nextPut: aCharacter].
	stream @env0:nextPutAll: self.
	rightPad @env0:timesRepeat: [stream @env0:nextPut: aCharacter].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
___padLeftJustified___: width fill: aCharacter
	| mySize stream |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ ___padLeftJustified___: width fill: aCharacter].
	mySize := self @env0:size.
	width @env0:<= mySize ifTrue: [^ self].
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: self.
	(width @env0:- mySize) @env0:timesRepeat: [
		stream @env0:nextPut: aCharacter].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
___padRightJustified___: width fill: aCharacter
	| mySize stream |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ ___padRightJustified___: width fill: aCharacter].
	mySize := self @env0:size.
	width @env0:<= mySize ifTrue: [^ self].
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	(width @env0:- mySize) @env0:timesRepeat: [
		stream @env0:nextPut: aCharacter].
	stream @env0:nextPutAll: self.
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub
	"Return the number of non-overlapping occurrences of substring sub."

	^ self ___pyCount___: sub start: nil end: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub _: start
	"count(sub, start) -- occurrences at or after 0-based ``start''."

	^ self ___pyCount___: sub start: start end: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
count: sub _: start _: stop
	"count(sub, start, stop) -- occurrences within the [start, stop)
	slice, Python 0-based half-open indices (negatives wrap)."

	^ self ___pyCount___: sub start: start end: stop
%

category: 'Grail-String Methods'
method: CharacterCollection
_count: positional kw: kwargs
	"Varargs entry for ``count(sub[, start[, stop]])''."

	| sub start stop |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'count() takes at least 1 argument'
	].
	self ___pyCheckArity___: positional max: 3 name: 'count'.
	sub := positional @env0:at: 1.
	positional @env0:size @env0:>= 2
		ifTrue: [start := positional @env0:at: 2]
		ifFalse: [^ self count: sub].
	positional @env0:size @env0:>= 3
		ifTrue: [stop := positional @env0:at: 3]
		ifFalse: [^ self count: sub _: start].
	^ self count: sub _: start _: stop
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyEncodeUTF7___: errors
	"UTF-7, via the shared implementation keyed by code points -- see
	bytes class >> ___utf7FromCodePoints___:, which PyStrSurrogate also
	calls so that a lone surrogate encodes rather than raising."
	^ bytes @env1:___utf7FromCodePoints___:
		((1 @env0:to: self @env0:size) @env0:collect: [:i |
			(self @env0:at: i) @env0:codePoint])
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyEncodeUTF32___: withBOM be: bigEndian errors: errors
	"Encode the receiver as UTF-32 bytes: every code point is ONE 32-bit
	unit, so unlike UTF-16 there is no surrogate pair to build -- and a lone
	surrogate in the input is unencodable rather than half of something.

	Here rather than in _codecs beside the BOM and incremental logic, which
	is where it started: a per-character Python loop costs ~55us a character
	in Grail, so 5000 characters took 278ms against utf-16's 1ms and
	test_codecs TIMED OUT.  The byte maths belongs where utf-16's already
	is; the Python entry points delegate here exactly as the utf-16 ones
	delegate to ___pyEncodeUTF16___."
	| ws emit |
	ws := AppendStream @env0:on: ByteArray @env0:new.
	emit := [:u |
		bigEndian
			ifTrue: [ws
				@env0:nextPut: ((u @env0:bitShift: -24) @env0:bitAnd: 16rFF);
				@env0:nextPut: ((u @env0:bitShift: -16) @env0:bitAnd: 16rFF);
				@env0:nextPut: ((u @env0:bitShift: -8) @env0:bitAnd: 16rFF);
				@env0:nextPut: (u @env0:bitAnd: 16rFF)]
			ifFalse: [ws
				@env0:nextPut: (u @env0:bitAnd: 16rFF);
				@env0:nextPut: ((u @env0:bitShift: -8) @env0:bitAnd: 16rFF);
				@env0:nextPut: ((u @env0:bitShift: -16) @env0:bitAnd: 16rFF);
				@env0:nextPut: ((u @env0:bitShift: -24) @env0:bitAnd: 16rFF)]].
	withBOM ifTrue: [emit value: 16rFEFF].
	1 @env0:to: self @env0:size do: [:i | | cp |
		cp := (self @env0:at: i) @env0:codePoint.
		(cp @env0:>= 16rD800 and: [cp @env0:<= 16rDFFF])
			ifTrue: [ws @env0:nextPutAll: (self ___unencodable___: cp
				at: i
				encoding: (bigEndian ifTrue: ['utf-32-be'] ifFalse: ['utf-32-le'])
				errors: errors
				reason: 'surrogates not allowed')]
			ifFalse: [emit value: cp]].
	^ bytes @env0:withAll: ws @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyEncodeUTF16___: withBOM be: bigEndian
	"Encode the receiver as UTF-16 bytes.  BMP codepoints -> one 16-bit unit;
	supplementary -> a surrogate pair.  ``withBOM'' prepends U+FEFF; ``bigEndian''
	selects byte order (little-endian otherwise)."
	| ws emit |
	ws := AppendStream @env0:on: ByteArray @env0:new.
	emit := [:u | | hi lo |
		hi := (u @env0:bitShift: -8) @env0:bitAnd: 16rFF.
		lo := u @env0:bitAnd: 16rFF.
		bigEndian ifTrue: [ws @env0:nextPut: hi; @env0:nextPut: lo]
			ifFalse: [ws @env0:nextPut: lo; @env0:nextPut: hi]].
	withBOM ifTrue: [emit value: 16rFEFF].
	1 @env0:to: self @env0:size do: [:i | | cp |
		cp := (self @env0:at: i) @env0:codePoint.
		cp @env0:<= 16rFFFF
			ifTrue: [emit value: cp]
			ifFalse: [ | v |
				v := cp @env0:- 16r10000.
				emit value: (16rD800 @env0:+ (v @env0:bitShift: -10)).
				emit value: (16rDC00 @env0:+ (v @env0:bitAnd: 16r3FF))]].
	^ bytes @env0:withAll: ws @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
encode
	"``s.encode()`` with no args — Python default is 'utf-8'."

	^ self encode: 'utf-8' _: 'strict'
%

category: 'Grail-String Methods'
method: CharacterCollection
___unencodable___: cp at: anIndex encoding: encName errors: errors reason: aReason
	"The bytes an UN-ENCODABLE code point contributes to the output under
	CPython's error policy -- empty for 'ignore', a replacement for the three
	substituting policies, and a raise for 'strict' (and for any name this
	does not know, which is what CPython does for an unregistered handler).

	Only 'strict' and 'ignore' were honoured before; 'replace',
	'backslashreplace' and 'xmlcharrefreplace' all raised UnicodeEncodeError
	as though they were 'strict'.  difflib's HtmlDiff renders a non-ASCII
	document by asking for xmlcharrefreplace, so it could not produce one at
	all (test_difflib test_make_file_usascii_charset_with_nonascii_input).

	'surrogateescape' and 'namereplace' deliberately still raise: the first
	needs LONE SURROGATES to survive in a str, which GemStone's Unicode
	strings do not carry.

	``namereplace'' IS implemented now: it wanted the Unicode character-name
	database, and Grail has one -- unicode_names >> ___nameForCodePoint: is
	what unicodedata.name() already answers from.  A code point WITHOUT a
	name falls through to the backslash escape, which is CPython's rule and
	is what makes ``[\udc80]'' come out the same under both handlers: a lone
	surrogate has no name."

	| digits out width |
	(errors @env0:= 'ignore') ifTrue: [^ ByteArray @env0:new].
	(errors @env0:= 'replace') ifTrue: [^ ByteArray @env0:with: 63].
	(errors @env0:= 'xmlcharrefreplace') ifTrue: [
		^ ('&#' @env0:, cp @env0:printString @env0:, ';') @env0:asByteArray].
	(errors @env0:= 'namereplace') ifTrue: [
		"``\N{LATIN SMALL LETTER A WITH DIAERESIS}'' for a code point that has
		a name.  One without -- a lone surrogate, an unassigned point -- takes
		the backslash escape below instead, which is why the guard there
		accepts this handler too."
		| nm |
		nm := unicode_names @env0:___nameForCodePoint: cp.
		nm @env0:isNil ifFalse: [
			^ ('\N{' @env0:, nm @env0:asString @env0:, '}') @env0:asByteArray]].
	((errors @env0:= 'backslashreplace') @env0:or: [errors @env0:= 'namereplace']) ifTrue: [
		"\xNN below 256, \uNNNN below 65536, \UNNNNNNNN above -- CPython picks
		the shortest escape that holds the code point."
		digits := '0123456789abcdef'.
		width := cp @env0:< 256
			ifTrue: [2]
			ifFalse: [cp @env0:< 16r10000 ifTrue: [4] ifFalse: [8]].
		out := WriteStream @env0:on: ByteArray @env0:new.
		out @env0:nextPut: 92.
		out @env0:nextPut: (width @env0:= 2
			ifTrue: [120]
			ifFalse: [width @env0:= 4 ifTrue: [117] ifFalse: [85]]).
		width @env0:to: 1 by: -1 do: [:shift |
			out @env0:nextPut: (digits @env0:at:
				(((cp @env0:bitShift: (shift @env0:- 1) @env0:* -4)
					@env0:bitAnd: 15) @env0:+ 1)) @env0:codePoint].
		^ out @env0:contents].
	"The five arguments CPython's UnicodeEncodeError carries -- encoding,
	the whole object, the span, and the reason -- rather than a
	pre-assembled message.  The message is then BUILT from them by
	UnicodeEncodeError >> __str__, which is how CPython does it, and how it
	comes to say ``in position 1'' at all: the raise site is the only place
	that knows where it is.  ``anIndex'' is Smalltalk 1-based; ``start'' is
	Python 0-based.

	Passing a message string as args[0] -- which every raise site here used
	to do -- also made exc.encoding answer the MESSAGE, because args[0] is
	what the encoding attribute reads."
	^ UnicodeEncodeError
		___signalNew___: { encName. self. anIndex @env0:- 1. anIndex. aReason }
		kw: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
_encode: positional kw: kwargs
	"``str.encode(encoding='utf-8', errors='strict')'' with KEYWORDS, the
	mirror of bytes>>_decode:kw:.  The fixed-arity selectors cover the
	positional spellings only, so ``s.encode('ascii', errors='replace')'' --
	the form encodings/idna.py uses to build its UnicodeDecodeError objects --
	raised ``encode() takes a different number of arguments''.  A keyword
	outside the two is CPython's ``encode() got an unexpected keyword
	argument''."

	| encoding errors |
	kwargs @env0:isNil ifFalse: [
		kwargs @env0:keysDo: [:k |
			(#('encoding' 'errors') @env0:includes: k @env0:asString) ifFalse: [
				^ TypeError ___signal___: 'encode() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''']]].
	encoding := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:includesKey: 'encoding'])
			ifTrue: [kwargs @env0:at: 'encoding']
			ifFalse: ['utf-8']].
	errors := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs @env0:isNil @env0:not @env0:and: [kwargs @env0:includesKey: 'errors'])
			ifTrue: [kwargs @env0:at: 'errors']
			ifFalse: ['strict']].
	^ self encode: encoding _: errors
%

category: 'Grail-String Methods'
method: CharacterCollection
encode: encoding _: errors
	"Encode the receiver to bytes under ``encoding'', honoring ``errors'' --
	see ___unencodable___:errors:message: for the policies.  UTF-8 is a real
	multi-byte encoder (GemStone encodeAsUTF8); UTF-16 (BOM/LE/BE) is
	supported; ascii and latin-1 / idna are single-byte."
	| enc size result info |
	enc := encoding @env0:asLowercase.
	size := self @env0:size.

	"unicode_escape: backslash-escape control and non-ASCII characters,
	yielding ASCII bytes (django.utils.log uses it).

	BOTH spellings.  bytes>>decode: normalises underscore to hyphen before it
	dispatches, so ``b'x'.decode('unicode-escape')'' has always worked while
	``s.encode('unicode-escape')'' -- the CANONICAL name, the one
	codecs.lookup('unicode-escape').name answers and the one
	encodings/unicode_escape.py registers -- raised LookupError.  The pair has
	to accept the same names in both directions or a round trip through the
	codec registry fails on the way out."
	((enc @env0:= 'unicode_escape') @env0:or: [enc @env0:= 'unicode-escape']) ifTrue: [
		| ws hexFor |
		hexFor := [:cp :width | | h |
			h := (cp @env0:printStringRadix: 16 showRadix: false) @env0:asLowercase.
			[h @env0:size @env0:< width] @env0:whileTrue: [h := '0' @env0:, h].
			h].
		ws := AppendStream @env0:on: String @env0:new.
		1 @env0:to: size do: [:i | | ch cp |
			ch := self @env0:at: i.
			cp := ch @env0:codePoint.
			cp @env0:= 92 ifTrue: [ws @env0:nextPutAll: '\\'] ifFalse: [
			cp @env0:= 10 ifTrue: [ws @env0:nextPutAll: '\n'] ifFalse: [
			cp @env0:= 13 ifTrue: [ws @env0:nextPutAll: '\r'] ifFalse: [
			cp @env0:= 9 ifTrue: [ws @env0:nextPutAll: '\t'] ifFalse: [
			((cp @env0:>= 32) and: [cp @env0:<= 126]) ifTrue: [ws @env0:nextPut: ch] ifFalse: [
			cp @env0:< 256
				ifTrue: [ws @env0:nextPutAll: '\x'. ws @env0:nextPutAll: (hexFor value: cp value: 2)]
				ifFalse: [
					"A SUPPLEMENTARY CODE POINT TAKES \\U AND EIGHT DIGITS.  This
					branch emitted \\u for everything above 255, so U+1D120 came
					out as ``\\u1d120'' -- a five-digit \\u, which is not an
					escape any reader accepts: decoding it back gives U+1D12
					followed by the character ``0''.  raw-unicode-escape beside
					it has always chosen the width by the code point, and this
					is the same rule."
					cp @env0:< 16r10000
						ifTrue: [ws @env0:nextPutAll: '\u'. ws @env0:nextPutAll: (hexFor value: cp value: 4)]
						ifFalse: [ws @env0:nextPutAll: '\U'. ws @env0:nextPutAll: (hexFor value: cp value: 8)]]]]]]]].
		^ bytes @env0:withAll: (ws @env0:contents @env0:asByteArray)].

	"UTF-8: real multi-byte encoder (GemStone)."
	((enc @env0:= 'utf-8') or: [enc @env0:= 'utf8']) ifTrue: [
		| u8 |
		u8 := self @env0:encodeAsUTF8.
		result := bytes ___new___: u8 @env0:size.
		1 @env0:to: u8 @env0:size do: [:i | result @env0:at: i put: (u8 @env0:at: i)].
		^ result].

	"UTF-16 family (utf-16 = BOM + little-endian, matching CPython)."
	(enc @env0:= 'utf-16') ifTrue: [^ self ___pyEncodeUTF16___: true be: false].
	((enc @env0:= 'utf-16-le') or: [enc @env0:= 'utf-16le']) ifTrue: [^ self ___pyEncodeUTF16___: false be: false].
	((enc @env0:= 'utf-16-be') or: [enc @env0:= 'utf-16be']) ifTrue: [^ self ___pyEncodeUTF16___: false be: true].

	"UTF-32 family, the same three shapes as UTF-16 above."
	((enc @env0:= 'utf-7') or: [enc @env0:= 'utf7']) ifTrue: [^ self ___pyEncodeUTF7___: errors].
	(enc @env0:= 'utf-32') ifTrue: [^ self ___pyEncodeUTF32___: true be: false errors: errors].
	((enc @env0:= 'utf-32-le') or: [enc @env0:= 'utf-32le']) ifTrue: [^ self ___pyEncodeUTF32___: false be: false errors: errors].
	((enc @env0:= 'utf-32-be') or: [enc @env0:= 'utf-32be']) ifTrue: [^ self ___pyEncodeUTF32___: false be: true errors: errors].

	"Single-byte: ascii (<=127), latin-1 / iso-8859-1 (<=255).  ``idna'' used
	to ride along as ascii, so a non-ASCII host could not be encoded; it now
	reaches the registry, and the vendored encodings/idna.py, below."
	((enc @env0:= 'ascii') or: [(enc @env0:= 'us-ascii')
		or: [(enc @env0:= 'latin1') or: [(enc @env0:= 'latin-1')
		or: [enc @env0:= 'iso-8859-1']]]]) ifTrue: [
		| max ws |
		max := ((enc @env0:= 'ascii') or: [enc @env0:= 'us-ascii'])
			ifTrue: [127] ifFalse: [255].
		ws := AppendStream @env0:on: ByteArray @env0:new.
		1 @env0:to: size do: [:i | | cv |
			cv := (self @env0:at: i) @env0:codePoint.
			cv @env0:> max
				ifTrue: [ws @env0:nextPutAll: (self ___unencodable___: cv
					at: i
					encoding: ((max @env0:= 127) ifTrue: ['ascii'] ifFalse: ['latin-1'])
					errors: errors
					reason: ((max @env0:= 127)
						ifTrue: ['ordinal not in range(128)']
						ifFalse: ['ordinal not in range(256)']))]
				ifFalse: [ws @env0:nextPut: cv]].
		^ bytes @env0:withAll: ws @env0:contents].

	"iso-8859-15 (latin-9): latin-1 with 8 code points replaced -- U+20AC EURO
	and 7 letters (Š š Ž ž Œ œ Ÿ) map to bytes A4/A6/A8/B4/B8/BC/BD/BE; the
	latin-1 chars normally at those bytes (currency / broken-bar / diaeresis /
	acute / cedilla / fractions) are NOT representable in latin-9.
	test_bytes BytesTest.test_custom: bytes('€', 'iso8859-15') == b'\xa4'."
	((enc @env0:= 'iso-8859-15') or: [(enc @env0:= 'iso8859-15')
		or: [(enc @env0:= 'iso8859_15') or: [(enc @env0:= 'latin-9')
		or: [(enc @env0:= 'latin9') or: [enc @env0:= 'l9']]]]]) ifTrue: [
		| ws |
		ws := WriteStream @env0:on: ByteArray @env0:new.
		1 @env0:to: size do: [:i | | cp b |
			cp := (self @env0:at: i) @env0:codePoint.
			b := nil.
			cp @env0:= 16r20AC ifTrue: [b := 16rA4].
			cp @env0:= 16r0160 ifTrue: [b := 16rA6].
			cp @env0:= 16r0161 ifTrue: [b := 16rA8].
			cp @env0:= 16r017D ifTrue: [b := 16rB4].
			cp @env0:= 16r017E ifTrue: [b := 16rB8].
			cp @env0:= 16r0152 ifTrue: [b := 16rBC].
			cp @env0:= 16r0153 ifTrue: [b := 16rBD].
			cp @env0:= 16r0178 ifTrue: [b := 16rBE].
			(b == nil and: [cp @env0:< 256]) ifTrue: [
				(#(16rA4 16rA6 16rA8 16rB4 16rB8 16rBC 16rBD 16rBE) @env0:includes: cp)
					ifFalse: [b := cp]].
			b == nil
				ifTrue: [ws @env0:nextPutAll: (self ___unencodable___: cp
					at: i
					encoding: 'charmap'
					errors: errors
					reason: 'character maps to <undefined>')]
				ifFalse: [ws @env0:nextPut: b]].
		^ bytes @env0:withAll: ws @env0:contents].

	"raw-unicode-escape, the inverse of the bytes>>decode branch: a code point
	below 256 is one Latin-1 byte, anything above becomes a LOWERCASE-hex
	\uXXXX / \UXXXXXXXX escape.  Backslashes already in the string are NOT
	doubled, which is what makes the codec lossy: encode of a backslash-u
	literal and encode of the character it names collide."
	((enc @env0:= 'raw-unicode-escape') or: [
		enc @env0:= 'raw_unicode_escape']) ifTrue: [
		| ws digits |
		ws := WriteStream @env0:on: ByteArray @env0:new.
		digits := '0123456789abcdef'.
		1 @env0:to: size do: [:i | | cp width |
			cp := (self @env0:at: i) @env0:codePoint.
			cp @env0:< 256
				ifTrue: [ws @env0:nextPut: cp]
				ifFalse: [
					width := cp @env0:< 16r10000 ifTrue: [4] ifFalse: [8].
					ws @env0:nextPut: 92.
					ws @env0:nextPut: (width @env0:= 4 ifTrue: [117] ifFalse: [85]).
					"Emit the nibbles most-significant first, zero-padded to
					the escape's fixed width."
					width @env0:to: 1 by: -1 do: [:shift |
						ws @env0:nextPut: (digits @env0:at:
							(((cp @env0:bitShift: (shift @env0:- 1) @env0:* -4)
								@env0:bitAnd: 15) @env0:+ 1)) @env0:codePoint]]].
		^ bytes @env0:withAll: ws @env0:contents].

	"A REGISTERED codec, before giving up -- see importlib class >>
	___registeredCodecInfoFor___:.  CodecInfo.encode answers (bytes,
	length), of which the caller wants the bytes."
	info := (Python @env0:at: #importlib)
		@env0:___codecRoundTrip___: enc selector: #'encode' with: self errors: errors.
	info == nil ifFalse: [^ info].
	LookupError ___signal___: ('unknown encoding: ' @env0:, encoding)
%

category: 'Grail-String Methods'
method: CharacterCollection
encode: encoding
	"``s.encode(encoding)`` -- default 'strict' error policy.  See
	encode:_: for the full codec (utf-8 multi-byte, utf-16, ascii, latin-1,
	idna, unicode_escape)."

	^ self encode: encoding _: 'strict'
%

category: 'Grail-String Methods'
method: CharacterCollection
endswith: suffix
	"Test whether string ends with the specified suffix.  An empty suffix is
	always a suffix (CPython) -- GemStone's endsWith: returns false for an
	empty argument, so special-case it.

	A TUPLE of suffixes is CPython's ``ends with ANY of these'' form; see
	startswith: for why handing one to GemStone was an uncatchable error."

	| plain |
	(suffix isKindOf: tuple) ifTrue: [
		1 @env0:to: (suffix @env0:size) do: [:ti |
			(self endswith: (suffix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	suffix @env0:___isPyStr___ ifFalse: [
		TypeError ___signal___:
			('endswith first arg must be str or a tuple of str, not '
				@env0:, (bytes ___pyTypeNameOf___: suffix))].
	"See startswith: -- a suffix holding a surrogate cannot end a
	surrogate-free string."
	plain := suffix @env0:___pyPlainStr___.
	plain @env0:== nil ifTrue: [^ false].
	plain @env0:isEmpty ifTrue: [^ true].
	^ self @env0:endsWith: plain
%

category: 'Grail-String Methods'
method: CharacterCollection
endswith: suffix _: start
	"str.endswith(suffix, start) -- test self[start:]."

	^ self endswith: suffix _: start _: None
%

category: 'Grail-String Methods'
method: CharacterCollection
endswith: suffix _: start _: end
	"str.endswith(suffix, start, end) -- test whether self[start:end] ends
	with suffix (CPython None / negative-index clamping).  A window whose
	start lies past its end matches nothing, not even an empty suffix --
	``''.endswith('', 1, 0)'' is False -- which the clamped slice alone
	cannot see; the slice still runs first so a bad suffix is refused."

	| w |
	((self ___boundedSlice___: start end: end) endswith: suffix) ifFalse: [^ false].
	w := self ___pyAdjust___: start end: end.
	^ (w @env0:at: 1) @env0:<= (w @env0:at: 2)
%

category: 'Grail-String Methods'
method: CharacterCollection
_endswith: positional kw: kwargs
	"Varargs form of endswith(suffix[, start[, end]]) -- reached via the
	BoundMethod fallback (getattr(s,'endswith')(...))."

	| suffix start end |
	positional @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___: 'endswith() takes at least 1 argument (0 given)'].
	positional @env0:size @env0:> 3 ifTrue: [
		TypeError ___signal___: ('endswith() takes at most 3 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	suffix := positional @env0:at: 1.
	start := (positional @env0:size @env0:>= 2) @env0:ifTrue: [positional @env0:at: 2] @env0:ifFalse: [None].
	end := (positional @env0:size @env0:>= 3) @env0:ifTrue: [positional @env0:at: 3] @env0:ifFalse: [None].
	^ self endswith: suffix _: start _: end
%

category: 'Grail-String Methods'
method: CharacterCollection
expandtabs
	"str.expandtabs() -> copy with tabs expanded to the next multiple of
	8 columns (column-aware, matching CPython -- not a blind replace)."

	^ self ___expandtabs: 8
%

category: 'Grail-String Methods'
method: CharacterCollection
expandtabs: tabsize
	"str.expandtabs(tabsize) -> copy with tabs expanded to the next
	multiple of tabsize columns; tabsize <= 0 deletes tabs."

	^ self ___expandtabs: tabsize
%

category: 'Grail-String Methods'
method: CharacterCollection
___expandtabs: tabsize
	"Column-aware tab expansion shared by expandtabs / expandtabs:.  The
	column counter resets on newline / carriage-return.  Builds the result
	on ``copyEmpty'' so it keeps the receiver's str class."

	| ws col n cp nSpaces |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ ___expandtabs: tabsize].
	ws := WriteStream @env0:on: (self @env0:copyEmpty).
	col := 0.
	n := self @env0:size.
	1 @env0:to: n do: [:i | | ch |
		ch := self @env0:at: i.
		cp := ch @env0:codePoint.
		(cp @env0:= 9) ifTrue: [
			(tabsize @env0:> 0) ifTrue: [
				nSpaces := tabsize @env0:- (col @env0:\\ tabsize).
				nSpaces @env0:timesRepeat: [ws @env0:nextPut: (Character @env0:space)].
				col := col @env0:+ nSpaces
			]
		] ifFalse: [
			((cp @env0:= 10) or: [cp @env0:= 13])
				ifTrue: [ws @env0:nextPut: ch. col := 0]
				ifFalse: [ws @env0:nextPut: ch. col := col @env0:+ 1]
		]
	].
	^ ws @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub
	"Return the lowest index where substring sub is found, or -1 if not found."

	^ self ___pyFind___: sub start: nil end: nil reverse: false
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub _: start
	"Python ``s.find(sub, start)'' -- see ___pyFind___:start:end:reverse:."

	^ self ___pyFind___: sub start: start end: nil reverse: false
%

category: 'Grail-String Methods'
method: CharacterCollection
find: sub _: start _: stop
	"Python ``s.find(sub, start, stop)'' -- lowest 0-based index of sub
	within the [start, stop) slice, else -1.  The index is absolute, not
	relative to ``start''; see ___pyAdjust___:end: for the bounds."

	^ self ___pyFind___: sub start: start end: stop reverse: false
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyNeedle___: sub for: name
	"The plain string a find/count/index-family call searches for, or nil
	for a needle holding a surrogate -- which cannot occur in a
	surrogate-free receiver, so every such search is a miss.

	Anything that is not a str is CPython's TypeError.  It used to be handed
	on to the kernel search primitive, whose ArgumentTypeError is a SMALLTALK
	error no ``except'' can catch: ``'hello'.find(42)'' ended the session.
	``name'' prefixes the message as CPython's argument clinic does
	(``find() argument 1 must be str, not int''); nil for the methods whose
	message has no prefix (partition)."

	sub @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: (name @env0:== nil
				ifTrue: ['must be str, not ']
				ifFalse: [name @env0:, '() argument 1 must be str, not '])
			@env0:, (bytes ___pyTypeNameOf___: sub)].
	^ sub @env0:___pyPlainStr___
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyAdjust___: start end: end
	"CPython's ADJUST_INDICES for the [start, end) window of a search:
	{ start. end } as 0-based offsets.  None (or nil) is the default bound;
	anything else is coerced through __index__ (PEP 357) first, because the
	arithmetic below is env-0 and on a Python object an uncatchable
	MessageNotUnderstood.  Negatives count from the end and END clamps to
	the length -- but START does not clamp: ``'abc'.find('', 4)'' is -1 while
	``'abc'.find('', 3)'' is 3, and ``''.startswith('', 1, 0)'' is False.
	Callers therefore treat start > end as an empty window that matches
	nothing, not even the empty string."

	| n s e |
	n := self @env0:size.
	s := (start == nil or: [start == None])
		ifTrue: [0] ifFalse: [start ___asIndex___].
	e := (end == nil or: [end == None])
		ifTrue: [n] ifFalse: [end ___asIndex___].
	e @env0:> n
		ifTrue: [e := n]
		ifFalse: [e @env0:< 0 ifTrue: [e := (e @env0:+ n) @env0:max: 0]].
	s @env0:< 0 ifTrue: [s := (s @env0:+ n) @env0:max: 0].
	^ Array @env0:with: s with: e
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyFind___: sub start: start end: end reverse: reverse
	^ self ___pyFind___: sub start: start end: end reverse: reverse
		name: (reverse ifTrue: ['rfind'] ifFalse: ['find'])
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyFind___: sub start: start end: end reverse: reverse name: name
	"CPython's any_find_slice: the 0-based index of the first (or, when
	``reverse'', the last) occurrence of sub lying wholly inside
	self[start:end], else -1.  An empty needle matches at the window's
	start, or reversed at its end -- ``'abc'.rfind('')'' is 3."

	| p w s e m r |
	p := self ___pyNeedle___: sub for: name.
	w := self ___pyAdjust___: start end: end.
	s := w @env0:at: 1.
	e := w @env0:at: 2.
	p @env0:== nil ifTrue: [^ -1].
	m := p @env0:size.
	(e @env0:- s) @env0:< m ifTrue: [^ -1].
	m @env0:= 0 ifTrue: [^ reverse ifTrue: [e] ifFalse: [s]].
	reverse ifTrue: [
		"Backwards from the last start whose match still ends by ``e''."
		r := self @env0:findLastSubString: p startingAt: e @env0:- m @env0:+ 1.
		^ r @env0:> s ifTrue: [r @env0:- 1] ifFalse: [-1]].
	e @env0:= self @env0:size ifTrue: [
		r := self @env0:___pyFindString___: p startingAt: s @env0:+ 1.
		^ r @env0:= 0 ifTrue: [-1] ifFalse: [r @env0:- 1]].
	r := (self @env0:copyFrom: s @env0:+ 1 to: e) @env0:___pyFindString___: p startingAt: 1.
	^ r @env0:= 0 ifTrue: [-1] ifFalse: [r @env0:+ s @env0:- 1]
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyIndex___: sub start: start end: end reverse: reverse
	"str.index / str.rindex: ___pyFind___, with CPython's ValueError for a
	miss."

	| i |
	i := self ___pyFind___: sub start: start end: end reverse: reverse
		name: (reverse ifTrue: ['rindex'] ifFalse: ['index']).
	i @env0:< 0 ifTrue: [^ ValueError ___signal___: 'substring not found'].
	^ i
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyCount___: sub start: start end: end
	"CPython's str.count: non-overlapping occurrences of sub wholly inside
	self[start:end].  An empty needle occurs at every position of the window
	including its end, so ``'aaa'.count('')'' is 4."

	| p w s e m target pos idx count |
	p := self ___pyNeedle___: sub for: 'count'.
	w := self ___pyAdjust___: start end: end.
	s := w @env0:at: 1.
	e := w @env0:at: 2.
	p @env0:== nil ifTrue: [^ 0].
	m := p @env0:size.
	(e @env0:- s) @env0:< m ifTrue: [^ 0].
	m @env0:= 0 ifTrue: [^ e @env0:- s @env0:+ 1].
	target := (s @env0:= 0 and: [e @env0:= self @env0:size])
		ifTrue: [self]
		ifFalse: [self @env0:copyFrom: s @env0:+ 1 to: e].
	count := 0.
	pos := 1.
	[(pos @env0:+ m @env0:- 1) @env0:<= target @env0:size
		and: [(idx := target @env0:___pyFindString___: p startingAt: pos) @env0:> 0]]
		whileTrue: [
			count := count @env0:+ 1.
			pos := idx @env0:+ m].
	^ count
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyCheckArity___: positional max: max name: name
	"CPython's ``name expected at most max arguments, got n'' for a varargs
	entry handed too many.  The entries used to read only the arguments they
	knew about and silently drop the rest, so ``s.count(x, None, None,
	None)'' answered a count where CPython raises (test_find_etc_raise_
	correct_error_messages, issue 11828)."

	positional @env0:size @env0:> max ifTrue: [
		^ TypeError ___signal___: name @env0:, ' expected at most '
			@env0:, max @env0:printString @env0:, ' arguments, got '
			@env0:, positional @env0:size @env0:printString]
%

category: 'Grail-String Methods'
method: CharacterCollection
_find: positional kw: kwargs
	"Varargs entry for ``s.find(sub[, start[, stop]])'' — routes by
	positional arity so a call site that can't resolve the arity
	statically still reaches the right fixed-arity method."

	| nargs |
	nargs := positional @env0:size.
	nargs @env0:= 1 ifTrue: [^ self find: (positional @env0:at: 1)].
	nargs @env0:= 2 ifTrue: [
		^ self find: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	nargs @env0:= 3 ifTrue: [
		^ self find: (positional @env0:at: 1)
			_: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	self ___pyCheckArity___: positional max: 3 name: 'find'.
	TypeError ___signal___: 'find expected at least 1 argument, got 0'
%

category: 'Grail-String Methods'
method: CharacterCollection
format
	"Python ``str.format()'' with no arguments — placeholders are
	rendered as literal text only if no ``{'' / ``}'' appears.
	Round-trips ``{{'' / ``}}'' escapes."

	^ self _format: #() kw: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
_format: positional kw: kwargs
	"Python ``str.format(*args, **kwargs)'' (and, with positional nil,
	format_map).

	CPython's do_string_format -- Objects/stringlib/unicode_format.h --
	ported routine for routine: build_string/do_markup here,
	MarkupIterator_next's literal scan inline, parse_field
	(___parseFormatFieldAt___:), field_name_split + get_field_object
	(___formatFieldObject___:positional:kw:auto:), do_conversion
	(___formatConvert___:with:) and render_field (builtins format:_:, which
	checks __format__ answered a str).  The same split src/python/stdlib/
	_string.py exposes to string.Formatter, so the two agree.

	The hand-written parser this replaces had no ``{0.attr}'' / ``{0[i]}''
	(``'{0.real}'.format(3)'' died in an uncatchable Smalltalk ArgumentError),
	no ``!a'', accepted ``'{0}{}''' that CPython refuses, and did not expand
	nested fields in a spec.

	``auto'' is CPython's AutoNumber -- { state. next field number } -- shared
	by a spec's nested fields; 2 is PEP 3101's recursion depth."

	^ self ___formatPositional___: positional kw: kwargs depth: 2
		auto: { #init. 0 }
%

category: 'Grail-String Methods'
method: CharacterCollection
___formatPositional___: positional kw: kwargs depth: depth auto: auto
	"build_string + do_markup: literal text and replacement fields, in order.

	``pieces'' stays nil for the overwhelmingly common case.  It is only
	created when a formatted field turns out to be a str holding LONE
	SURROGATES, which no CharacterCollection -- and so no WriteStream on one
	-- can hold; see the assembly at the end."

	| size out pieces pos |
	depth @env0:<= 0 ifTrue: [
		^ ValueError ___signal___: 'Max string recursion exceeded'].
	size := self @env0:size.
	out := WriteStream @env0:on: (Unicode7 ___new___).
	pieces := nil.
	pos := 1.
	[pos @env0:<= size] @env0:whileTrue: [
		| start c markup atEnd len |
		"MarkupIterator_next: literal text up to the end, an escaped brace,
		or an unescaped '{'.  An escaped brace ends the literal WITH one
		brace in it; the scan resumes after the pair."
		start := pos.
		c := nil.
		markup := false.
		[markup @env0:not and: [pos @env0:<= size]] @env0:whileTrue: [
			c := self @env0:at: pos.
			pos := pos @env0:+ 1.
			(c == ${ or: [c == $}]) ifTrue: [markup := true]].
		atEnd := pos @env0:> size.
		len := pos @env0:- start.
		(c == $} and: [atEnd or: [(self @env0:at: pos) ~~ c]]) ifTrue: [
			^ ValueError ___signal___: 'Single ''}'' encountered in format string'].
		(atEnd and: [c == ${]) ifTrue: [
			^ ValueError ___signal___: 'Single ''{'' encountered in format string'].
		atEnd ifFalse: [
			(self @env0:at: pos) == c
				ifTrue: [pos := pos @env0:+ 1. markup := false]
				ifFalse: [len := len @env0:- 1]].
		len @env0:> 0 ifTrue: [
			out @env0:nextPutAll: (self @env0:copyFrom: start to: start @env0:+ len @env0:- 1)].
		markup ifTrue: [
			| field piece |
			field := self ___parseFormatFieldAt___: pos.
			pos := field @env0:at: 4.
			piece := self ___renderFormatField___: field positional: positional
				kw: kwargs depth: depth auto: auto.
			(piece @env0:isKindOf: PyStrSurrogate)
				ifTrue: [
					"Flush what the stream holds and set it aside: the rest of
					the result has to be assembled out of CODE POINTS, because
					this piece has one no Character can represent.  A filename
					that is not valid UTF-8 arrives here through PEP 383's
					surrogateescape, and ``'--- {}'.format(fname)'' is exactly
					what difflib's unified_diff does with it."
					pieces @env0:isNil ifTrue: [pieces := OrderedCollection @env0:new].
					pieces @env0:add: out @env0:contents.
					pieces @env0:add: piece.
					out := WriteStream @env0:on: (Unicode7 ___new___)]
				ifFalse: [out @env0:nextPutAll: piece @env0:asString]]].
	pieces @env0:isNil ifTrue: [^ out @env0:contents].
	"___fromCodePoints___ demotes back to an ordinary string when nothing in
	the result was actually a surrogate after all."
	pieces @env0:add: out @env0:contents.
	^ PyStrSurrogate @env0:___fromCodePoints___: (self ___codePointsOfAll___: pieces)
%

category: 'Grail-String Methods'
method: CharacterCollection
___parseFormatFieldAt___: startPos
	"parse_field, from just after a field's '{'.  Answer { field name. format
	spec. conversion Character or nil. position after the field }.

	The name runs to '}', ':' or '!' -- a '[...]' may hold any of them --
	then an optional conversion, then a spec whose nested braces are
	counted.  Each error is CPython's, in CPython's order."

	| size pos c done name specStart count conv |
	size := self @env0:size.
	pos := startPos.
	c := nil.
	done := false.
	[done @env0:not and: [pos @env0:<= size]] @env0:whileTrue: [
		c := self @env0:at: pos.
		pos := pos @env0:+ 1.
		c == ${ ifTrue: [
			^ ValueError ___signal___: 'unexpected ''{'' in field name'].
		c == $[
			ifTrue: [
				[pos @env0:<= size and: [(self @env0:at: pos) ~~ $]]]
					@env0:whileTrue: [pos := pos @env0:+ 1]]
			ifFalse: [
				(c == $} or: [c == $: or: [c == $!]]) ifTrue: [done := true]]].
	name := self @env0:copyFrom: startPos to: pos @env0:- 2.
	conv := nil.
	(c == $! or: [c == $:]) ifTrue: [
		c == $! ifTrue: [
			pos @env0:> size ifTrue: [
				^ ValueError ___signal___:
					'end of string while looking for conversion specifier'].
			conv := self @env0:at: pos.
			pos := pos @env0:+ 1.
			pos @env0:<= size ifTrue: [
				c := self @env0:at: pos.
				pos := pos @env0:+ 1.
				c == $} ifTrue: [^ { name. ''. conv. pos }].
				c == $: ifFalse: [
					^ ValueError ___signal___: 'expected '':'' after conversion specifier']]].
		specStart := pos.
		count := 1.
		[pos @env0:<= size] @env0:whileTrue: [
			c := self @env0:at: pos.
			pos := pos @env0:+ 1.
			c == ${ ifTrue: [count := count @env0:+ 1].
			c == $} ifTrue: [
				count := count @env0:- 1.
				count == 0 ifTrue: [
					^ { name. self @env0:copyFrom: specStart to: pos @env0:- 2. conv. pos }]]].
		^ ValueError ___signal___: 'unmatched ''{'' in format spec'].
	c == $} ifFalse: [
		^ ValueError ___signal___: 'expected ''}'' before end of string'].
	^ { name. ''. nil. pos }
%

category: 'Grail-String Methods'
method: CharacterCollection
___renderFormatField___: field positional: positional kw: kwargs depth: depth auto: auto
	"output_markup: the field's object, its conversion, its spec -- expanded
	ONE level down when it holds fields of its own, sharing the auto
	numbering -- and render_field: PyObject_Format, which refuses a
	__format__ that answers a non-str (as builtins format:_: does; inline
	here because the spec is always a str and this is per field)."

	| obj spec result |
	obj := self ___formatFieldObject___: (field @env0:at: 1)
		positional: positional kw: kwargs auto: auto.
	(field @env0:at: 3) == nil ifFalse: [
		obj := self ___formatConvert___: obj with: (field @env0:at: 3)].
	spec := field @env0:at: 2.
	(spec @env0:includes: ${) ifTrue: [
		spec := spec ___formatPositional___: positional kw: kwargs
			depth: depth @env0:- 1 auto: auto].
	result := obj __format__: spec.
	((result @env0:isKindOf: CharacterCollection)
		or: [result @env0:isKindOf: PyStrSurrogate]) ifFalse: [
		^ TypeError ___signal___: ('__format__ must return a str, not '
			@env0:, (result ___pyTypeNameForError___) @env0:asString)].
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
___formatFieldObject___: fieldName positional: positional kw: kwargs auto: auto
	"field_name_split + get_field_object.  The first part, up to '.' or '[',
	is an index when it is all decimal digits (or empty: the next auto
	number) and a keyword otherwise; then each ``.name'' is a getattr and
	each ``[key]'' a __getitem__ (an int key when all decimal digits)."

	| size i first idx empty obj |
	size := fieldName @env0:size.
	"``{}'' -- the commonest field by far -- is the next auto number and
	nothing else: no name to copy or scan."
	size == 0 ifTrue: [
		(auto @env0:at: 1) == #manual ifTrue: [
			^ ValueError ___signal___: 'cannot switch from manual field specification to automatic field numbering'].
		auto @env0:at: 1 put: #auto.
		idx := auto @env0:at: 2.
		auto @env0:at: 2 put: idx @env0:+ 1.
		positional == nil ifTrue: [
			^ ValueError ___signal___: 'Format string contains positional fields'].
		idx @env0:>= positional @env0:size ifTrue: [
			^ IndexError ___signal___: 'Replacement index ' @env0:,
				idx @env0:printString @env0:, ' out of range for positional args tuple'].
		^ positional @env0:at: idx @env0:+ 1].
	i := 1.
	[i @env0:<= size and: [(fieldName @env0:at: i) ~~ $. and: [(fieldName @env0:at: i) ~~ $[]]]
		@env0:whileTrue: [i := i @env0:+ 1].
	"A plain name -- no ``.'' or ``['' -- is the whole field: no copy."
	first := i @env0:> size
		ifTrue: [fieldName]
		ifFalse: [fieldName @env0:copyFrom: 1 to: i @env0:- 1].
	idx := self ___formatIndexOf___: first.
	empty := first @env0:isEmpty.
	(empty or: [idx ~~ -1]) ifTrue: [
		"The AutoNumber state machine: the first numeric field decides, and
		the other kind is refused for the rest of the string."
		(auto @env0:at: 1) == #init ifTrue: [
			auto @env0:at: 1 put: (empty ifTrue: [#auto] ifFalse: [#manual])].
		(auto @env0:at: 1) == #manual
			ifTrue: [empty ifTrue: [
				^ ValueError ___signal___: 'cannot switch from manual field specification to automatic field numbering']]
			ifFalse: [empty ifFalse: [
				^ ValueError ___signal___: 'cannot switch from automatic field numbering to manual field specification']].
		empty ifTrue: [
			idx := auto @env0:at: 2.
			auto @env0:at: 2 put: idx @env0:+ 1]].
	idx == -1
		ifTrue: [
			kwargs == nil ifTrue: [^ KeyError ___signal___: first @env0:asString].
			obj := kwargs __getitem__: first @env0:asString]
		ifFalse: [
			positional == nil ifTrue: [
				^ ValueError ___signal___: 'Format string contains positional fields'].
			idx @env0:>= positional @env0:size ifTrue: [
				^ IndexError ___signal___: 'Replacement index ' @env0:,
					idx @env0:printString @env0:, ' out of range for positional args tuple'].
			obj := positional @env0:at: idx @env0:+ 1].
	"FieldNameIterator_next, over the rest."
	[i @env0:<= size] @env0:whileTrue: [
		| c start name isAttr key |
		c := fieldName @env0:at: i.
		i := i @env0:+ 1.
		c == $.
			ifTrue: [
				start := i.
				[i @env0:<= size and: [(fieldName @env0:at: i) ~~ $. and: [(fieldName @env0:at: i) ~~ $[]]]
					@env0:whileTrue: [i := i @env0:+ 1].
				name := fieldName @env0:copyFrom: start to: i @env0:- 1.
				isAttr := true]
			ifFalse: [
				| closed |
				c == $[ ifFalse: [
					^ ValueError ___signal___: 'Only ''.'' or ''['' may follow '']'' in format field specifier'].
				start := i.
				closed := false.
				[closed @env0:not and: [i @env0:<= size]] @env0:whileTrue: [
					(fieldName @env0:at: i) == $] ifTrue: [closed := true].
					i := i @env0:+ 1].
				closed ifFalse: [
					^ ValueError ___signal___: 'Missing '']'' in format string'].
				name := fieldName @env0:copyFrom: start to: i @env0:- 2.
				isAttr := false].
		name @env0:isEmpty ifTrue: [
			^ ValueError ___signal___: 'Empty attribute in format string'].
		isAttr
			ifTrue: [obj := (builtins instance) getattr: obj _: name @env0:asString]
			ifFalse: [
				key := self ___formatIndexOf___: name.
				obj := obj __getitem__: (key == -1 ifTrue: [name @env0:asString] ifFalse: [key])]].
	^ obj
%

category: 'Grail-String Methods'
method: CharacterCollection
___formatIndexOf___: aString
	"get_integer: the value when every character is a decimal digit, else
	-1.  Any Unicode decimal digit counts, as in CPython ('{\u0661}',
	ARABIC-INDIC DIGIT ONE, is field 1); a value past a C Py_ssize_t is
	CPython's ValueError."

	| acc |
	aString @env0:isEmpty ifTrue: [^ -1].
	acc := 0.
	aString @env0:do: [:ch |
		ch @env0:isDigit ifFalse: [^ -1].
		acc := (acc @env0:* 10) @env0:+ ch @env0:digitValue.
		acc @env0:> 9223372036854775807 ifTrue: [
			^ ValueError ___signal___: 'Too many decimal digits in format string']].
	^ acc
%

category: 'Grail-String Methods'
method: CharacterCollection
___formatConvert___: obj with: conv
	"do_conversion: !r is repr(), !s str(), !a ascii(); any other character
	is CPython's ValueError, spelled as it spells it."

	| cp |
	conv == $r ifTrue: [^ obj __repr__ @env0:___reprResult___].
	conv == $s ifTrue: [^ str __new__: obj].
	conv == $a ifTrue: [^ (builtins instance) ascii: obj].
	cp := conv @env0:codePoint.
	(cp @env0:> 32 and: [cp @env0:< 127]) ifTrue: [
		^ ValueError ___signal___: 'Unknown conversion specifier '
			@env0:, (String @env0:with: conv)].
	^ ValueError ___signal___: 'Unknown conversion specifier \x'
		@env0:, (cp @env0:printStringRadix: 16) @env0:asLowercase
%

category: 'Grail-String Methods'
method: CharacterCollection
___codePointsOfAll___: aCollection
	"The code points of a sequence of pieces, each either an ordinary string
	or a PyStrSurrogate -- the one representation that can hold both."

	| cps |
	cps := OrderedCollection @env0:new.
	aCollection @env0:do: [:piece |
		cps @env0:addAll: (piece @env0:___pyCodePoints___)].
	^ cps
%

set compile_env: 0

category: 'Grail-Testing'
method: CharacterCollection
___isPyStr___
	"True: every CharacterCollection is a Python str."

	^ true
%

category: 'Grail-Unicode Data'
classmethod: CharacterCollection
___pyCodePoint___: cp inRanges: ranges
	"Is cp in ``ranges'', a sorted literal Array of inclusive (first last)
	pairs from unicode_numeric_types.gs?  ASCII is answered without the
	search -- every table holds exactly 48-57 below 128 -- because that is
	nearly every character these predicates see."

	| lo hi mid |
	cp < 128 ifTrue: [^ cp >= 48 and: [cp <= 57]].
	lo := 1.
	hi := ranges size // 2.
	[lo <= hi] whileTrue: [
		mid := (lo + hi) // 2.
		cp < (ranges at: mid * 2 - 1)
			ifTrue: [hi := mid - 1]
			ifFalse: [
				cp > (ranges at: mid * 2)
					ifTrue: [lo := mid + 1]
					ifFalse: [^ true]]].
	^ false
%

category: 'Grail-Testing'
method: CharacterCollection
___reprResult___
	"A str is a valid __repr__ result -- see object >> ___reprResult___."

	^ self
%

category: 'Grail-Testing'
method: CharacterCollection
___strResult___
	"A str is a valid __str__ result -- see object >> ___strResult___."

	^ self
%

category: 'Grail-Testing'
method: CharacterCollection
___isExactPyStr___
	"See object >> ___isExactPyStr___.  True for the KERNEL string classes
	only: a user ``class Markup(str)'' allocates a CharacterCollection
	subclass and may override __eq__ / __lt__ / __radd__, so it must keep the
	reflected-operand priority CPython gives it."

	| c |
	c := self class.
	^ (c == Unicode7)
		or: [(c == Unicode16)
		or: [(c == Unicode32)
		or: [(c == String) or: [c == Symbol]]]]
%

category: 'Grail-Accessors'
method: CharacterCollection
___pyCodePoints___
	"See object >> ___pyCodePoints___.  An Array, not the receiver: the point
	of the shared accessor is that a caller may index it without caring which
	representation it came from."

	| n a |
	n := self size.
	a := Array new: n.
	1 to: n do: [:i | a at: i put: (self at: i) codePoint].
	^ a
%

category: 'Grail-Accessors'
method: CharacterCollection
___pyPlainStr___
	"Itself -- see object >> ___pyPlainStr___."

	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyFindString___: sub startingAt: start
	"GemStone's findString:startingAt:, generalised over Grail's str
	representations.  1-based index, or 0 when absent.

	EVERY substring search in this file goes through here.  Handing a
	PyStrSurrogate to the kernel primitive raised an ArgumentTypeError, and an
	ArgumentTypeError is a SMALLTALK error -- uncatchable from Python -- so
	``'abc'.find(name)'' on a surrogateescape'd name took down the caller
	rather than answering -1.  The answer is always ``absent'': a needle
	holding a surrogate cannot occur in a string that has none.

	A non-str needle is passed through UNCHANGED so the kernel still
	complains about it; answering 0 there would turn a type error into a
	silently wrong -1."

	| p m positions |
	sub ___isPyStr___ ifFalse: [^ self findString: sub startingAt: start].
	p := sub ___pyPlainStr___.
	p == nil ifTrue: [^ 0].
	"The kernel primitive is a naive scan: fast per comparison, but its worst
	case is (alignments x needle length), and CPython's suite builds exactly
	that case -- ``('a'*N*2 + 'b'*N + 'a'*N*2).find('a'*N + 'b'*N*2 + 'a'*N)''
	for N up to 10**6 is ~10**12 comparisons, i.e. a hang, where CPython's
	two-way search is linear (string_tests test_adaptive_find,
	test_find_many_lengths).  So bound the primitive's WORST case: past ~2**35
	comparisons (seconds, even at its memcmp speed) switch to the linear-time
	two-way search below, which costs ~0.5s on a 5M-char haystack interpreted.
	Gating on the bound rather than measured work keeps every ordinary search
	on the primitive; the price is that a huge needle in a huge haystack takes
	the interpreted path even when the primitive would have been quick."
	m := p size.
	positions := self size - start - m + 2.
	(m > 1 and: [positions > 0 and: [positions * m > 34359738368]])
		ifTrue: [^ self ___twoWayFind___: p startingAt: start].
	^ self findString: p startingAt: start
%

category: 'Grail-String Methods'
method: CharacterCollection
___twoWayFind___: needle startingAt: start
	"Crochemore-Perrin two-way search for needle (a plain string, size >= 2)
	at or after the 1-based ``start''.  1-based index, or 0 when absent --
	the contract of findString:startingAt:, which ___pyFindString___ falls
	back from when its naive worst case is unbounded.  O(n + m) time, O(1)
	space; the same algorithm as CPython's fastsearch.h and glibc's memmem.

	Indices below are 0-based offsets (``i'' into needle, ``j'' the
	alignment) and every at: adds 1.  Characters are immediates, so ``=='' is
	an exact code-point test; ordering, needed only for the critical
	factorization, goes through codePoint so the comparison mode cannot
	reorder it."

	| n m fwd rev suffix period periodic j i memory |
	n := self size.
	m := needle size.
	fwd := self ___twoWayMaxSuffix___: needle reversed: false.
	rev := self ___twoWayMaxSuffix___: needle reversed: true.
	(fwd at: 1) > (rev at: 1)
		ifTrue: [suffix := (fwd at: 1) + 1. period := fwd at: 2]
		ifFalse: [suffix := (rev at: 1) + 1. period := rev at: 2].
	"Periodic when the left half recurs one period on."
	periodic := period + suffix <= m.
	i := 1.
	[periodic and: [i <= suffix]] whileTrue: [
		(needle at: i) == (needle at: period + i) ifFalse: [periodic := false].
		i := i + 1].
	j := start - 1.
	periodic ifTrue: [
		memory := 0.
		[j <= (n - m)] whileTrue: [
			i := suffix max: memory.
			[i < m and: [(needle at: i + 1) == (self at: i + j + 1)]]
				whileTrue: [i := i + 1].
			i >= m
				ifTrue: [
					i := suffix - 1.
					[i >= memory and: [(needle at: i + 1) == (self at: i + j + 1)]]
						whileTrue: [i := i - 1].
					i < memory ifTrue: [^ j + 1].
					j := j + period.
					memory := m - period]
				ifFalse: [
					j := j + i - suffix + 1.
					memory := 0]].
		^ 0].
	period := (suffix max: m - suffix) + 1.
	[j <= (n - m)] whileTrue: [
		i := suffix.
		[i < m and: [(needle at: i + 1) == (self at: i + j + 1)]]
			whileTrue: [i := i + 1].
		i >= m
			ifTrue: [
				i := suffix - 1.
				[i >= 0 and: [(needle at: i + 1) == (self at: i + j + 1)]]
					whileTrue: [i := i - 1].
				i < 0 ifTrue: [^ j + 1].
				j := j + period]
			ifFalse: [j := j + i - suffix + 1]].
	^ 0
%

category: 'Grail-String Methods'
method: CharacterCollection
___twoWayMaxSuffix___: x reversed: reversed
	"The maximal suffix of x under code-point order (or its reverse), for
	___twoWayFind___'s critical factorization.  Answers { start - 1. period }
	with 0-based offsets, as in Crochemore-Perrin."

	| m ms j k p a b |
	m := x size.
	ms := -1. j := 0. k := 1. p := 1.
	[j + k < m] whileTrue: [
		a := (x at: j + k + 1) codePoint.
		b := (x at: ms + k + 1) codePoint.
		(reversed ifTrue: [a > b] ifFalse: [a < b])
			ifTrue: [
				j := j + k.
				k := 1.
				p := j - ms]
			ifFalse: [
				a = b
					ifTrue: [
						k = p
							ifTrue: [j := j + p. k := 1]
							ifFalse: [k := k + 1]]
					ifFalse: [
						ms := j.
						j := ms + 1.
						k := 1.
						p := 1]]].
	^ Array with: ms with: p
%

category: 'Grail-String Methods'
method: CharacterCollection
___formatPad___: count with: fillChar
	"Return a `count`-long string of `fillChar`s.  Helper for
	___applyAlignWidthFormat___ — GemStone's String class doesn't
	expose ``new:withAll:'', so use the two-step new+atAllPut form."

	| s |
	count <= 0 ifTrue: [^ ''].
	s := String new: count.
	s atAllPut: fillChar.
	^ s
%

set compile_env: 1

category: 'Grail-String Methods'
method: CharacterCollection
___applyAlignWidthFormat___: spec
	"Apply the [fill][<|>|^][width] subset of Python's format-spec
	mini-language to self.  Returns self unchanged when the spec
	uses any unsupported syntax (sign, precision, type, ``0''
	pad-left, ``,'' thousands separator, ...) — caller can layer
	on its own type-specific formatting first."

	| size align fill widthStr width padCount leftPad rightPad allDigits |
	size := spec @env0:size.
	size @env0:= 0 ifTrue: [^ self].
	"Detect [fill]align: align is one of < > ^ at index 1 or 2."
	(size @env0:>= 2 and: [
		#($< $> $^) @env0:includes: (spec @env0:at: 2)])
		ifTrue: [
			fill := spec @env0:at: 1.
			align := spec @env0:at: 2.
			widthStr := spec @env0:copyFrom: 3 to: size]
		ifFalse: [(#($< $> $^) @env0:includes: (spec @env0:at: 1))
			ifTrue: [
				fill := $ .
				align := spec @env0:at: 1.
				widthStr := spec @env0:copyFrom: 2 to: size]
			ifFalse: [
				fill := $ .
				align := $>.   "Numbers default to right-align."
				widthStr := spec]].
	widthStr @env0:isEmpty ifTrue: [^ self].
	"Width must be all decimal digits; reject otherwise."
	allDigits := true.
	widthStr @env0:do: [:c | (c @env0:isDigit) ifFalse: [allDigits := false]].
	allDigits ifFalse: [^ self].
	width := widthStr @env0:asNumber.
	(self @env0:size @env0:>= width) ifTrue: [^ self].
	padCount := width @env0:- self @env0:size.
	align @env0:= $> ifTrue: [
		^ ((self @env0:___formatPad___: padCount with: fill) @env0:, self) @env0:asString].
	align @env0:= $< ifTrue: [
		^ (self @env0:, (self @env0:___formatPad___: padCount with: fill)) @env0:asString].
	"Center: split padCount between left and right (right gets the
	extra when padCount is odd)."
	leftPad := padCount @env0:// 2.
	rightPad := padCount @env0:- leftPad.
	^ ((self @env0:___formatPad___: leftPad with: fill) @env0:,
		self @env0:, (self @env0:___formatPad___: rightPad with: fill)) @env0:asString
%

category: 'Grail-String Methods'
method: CharacterCollection
format_map: mapping
	"str.format_map(mapping) -- like format(**mapping) but keyword
	fields resolve through the mapping's __getitem__ directly (no dict
	copy), so mappings with custom item access (regex Match objects,
	defaultdict-alikes) work."

	^ self _format: nil kw: mapping
%

category: 'Grail-String Methods'
method: CharacterCollection
index: sub
	"Return the lowest index where substring sub is found. Raises ValueError if not found."

	^ self ___pyIndex___: sub start: nil end: nil reverse: false
%

category: 'Grail-String Methods'
method: CharacterCollection
index: sub _: start
	"str.index(sub, start): lowest index of substring sub at or after start;
	ValueError if absent.  Defined so str does NOT inherit the sequence
	(element-wise) index:_: from SequenceableCollection -- str.index takes a
	SUBSTRING (CPython str.index(sub[, start[, end]]))."

	^ self ___pyIndex___: sub start: start end: nil reverse: false
%

category: 'Grail-String Methods'
method: CharacterCollection
index: sub _: start _: stop
	"str.index(sub, start, stop): lowest index of substring sub within the
	half-open range [start, stop); ValueError if absent.  Shields str from
	the sequence index:_:_:."

	^ self ___pyIndex___: sub start: start end: stop reverse: false
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isalnum
	"True when every character is alphabetic or numeric (and there is one):
	CPython's isalpha or isdecimal or isdigit or isnumeric, and the last
	contains the other two.  The kernel's isAlphaNumeric is letter-or-DECIMAL,
	so the numeric half comes from the isnumeric table; the alphabetic half
	is still the kernel's isLetter."

	| numeric |
	self @env0:isEmpty ifTrue: [^ false].
	numeric := CharacterCollection @env0:___pyNumericRanges___.
	self @env0:do: [:char |
		(char @env0:isAlphaNumeric or: [
			CharacterCollection @env0:___pyCodePoint___: char @env0:codePoint inRanges: numeric])
				ifFalse: [^ false]].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
___pyAllInRanges___: ranges
	"Every character's code point in ``ranges'' -- one of the Numeric_Type
	tables -- and at least one character."

	self @env0:isEmpty ifTrue: [^ false].
	self @env0:do: [:char |
		(CharacterCollection @env0:___pyCodePoint___: char @env0:codePoint inRanges: ranges)
			ifFalse: [^ false]].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isalpha
	"Return True if all characters are alphabetic and there is at least one character."

	| isEmpty allAlpha |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allAlpha := true.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifFalse: [ allAlpha := false ].
	].
	^ allAlpha
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isascii
	"Return True if all characters are ASCII (code point < 128)."

	| allAscii |
	allAscii := true.
	self @env0:do: [:char |
		| cp |
		cp := char @env0:codePoint.
		(cp @env0:>= 128) ifTrue: [ allAscii := false ].
	].
	^ allAscii
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isdecimal
	"True when every character is Numeric_Type=Decimal (and there is one).

	isdecimal, isdigit and isnumeric are Unicode's Numeric_Type, each a
	superset of the one before, read from tables generated from CPython's own
	str methods (unicode_numeric_types.gs, scripts/generate_unicode_numeric.py).
	All three used to answer the kernel's Character >> isDigit -- the Decimal
	set only, and an older Unicode's -- so '\u00b2'.isdigit() and
	'\u00bd'.isnumeric() were False and 180 newer decimal digits were not
	decimal."

	^ self ___pyAllInRanges___: CharacterCollection @env0:___pyDecimalRanges___
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isdigit
	"True when every character is Numeric_Type Decimal or Digit -- '\u00b2'
	and the circled digits are digits but not decimal.  See isdecimal."

	^ self ___pyAllInRanges___: CharacterCollection @env0:___pyDigitRanges___
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isidentifier
	"Return True if string is a valid Python identifier."

	| isEmpty firstChar |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	"First character must be letter or underscore"
	firstChar := self @env0:first.
	((firstChar @env0:isLetter) @env0:| (firstChar == $_)) ifFalse: [ ^ false ].

	"Rest must be letters, digits, or underscores"
	(self @env0:allButFirst) @env0:do: [:char |
		| valid |
		valid := ((char @env0:isAlphaNumeric) @env0:| (char == $_)).
		valid ifFalse: [ ^ false ].
	].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
islower
	"Return True if all cased characters are lowercase and there is at least one cased character."

	| hasCased allLower |
	hasCased := false.
	allLower := true.
	self @env0:do: [:char |
		| isLetter isLower |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isLower := char @env0:isLowercase.
			isLower ifFalse: [ allLower := false ].
		].
	].
	^ hasCased @env0:& allLower
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isnumeric
	"True when every character has a Numeric_Type -- '\u00bd', Roman numerals
	and CJK numerals too.  This answered isdecimal.  See isdecimal."

	^ self ___pyAllInRanges___: CharacterCollection @env0:___pyNumericRanges___
%

category: 'Grail-String Representation'
method: CharacterCollection
___pyReprEscapeCodePoint___: cp quote: quoteCp on: aStream
	"ONE code point, escaped as repr() escapes it.  Extracted from __repr__ so
	PyStrSurrogate's own repr can apply the SAME rule.

	A string holding a lone surrogate is a different CLASS in Grail, and its
	repr was written separately: it emitted every non-surrogate code point
	VERBATIM.  So a string containing a surrogate came back with a real NUL, a
	real newline and a real tab in it, where the same string WITHOUT the
	surrogate escaped all three -- one rule, two implementations, and only one
	of them maintained.  test_builtin test_ascii is that string.

	A pure function of the code point -- the receiver is not consulted -- but
	an instance method, because the printability rule it defers to is one.

	The three escape widths are CPython's unicode_repr, picked by magnitude.
	Non-printable is the Unicode-CATEGORY rule and not ``cp < 32 or cp = 127'':
	unassigned, private-use, format characters and the non-ASCII separators
	escape too."

	| hex marker digits |
	cp @env0:== quoteCp ifTrue: [
		aStream @env0:nextPutAll: '\'.
		aStream @env0:nextPut: (Character @env0:codePoint: cp).
		^ self].
	cp @env0:== 92 ifTrue: [^ aStream @env0:nextPutAll: '\\'].
	cp @env0:== 10 ifTrue: [^ aStream @env0:nextPutAll: '\n'].
	cp @env0:== 13 ifTrue: [^ aStream @env0:nextPutAll: '\r'].
	cp @env0:== 9 ifTrue: [^ aStream @env0:nextPutAll: '\t'].
	(self ___pyIsPrintableCodePoint___: cp) ifTrue: [
		^ aStream @env0:nextPut: (Character @env0:codePoint: cp)].
	hex := (cp @env0:printStringRadix: 16 showRadix: false) @env0:asLowercase.
	cp @env0:<= 16rFF
		ifTrue: [marker := '\x'. digits := 2]
		ifFalse: [cp @env0:<= 16rFFFF
			ifTrue: [marker := '\u'. digits := 4]
			ifFalse: [marker := '\U'. digits := 8]].
	aStream @env0:nextPutAll: marker.
	[hex @env0:size @env0:< digits] @env0:whileTrue: [hex := '0' @env0:, hex].
	^ aStream @env0:nextPutAll: hex
%

category: 'Grail-String Test Methods'
method: CharacterCollection
___pyIsPrintableCodePoint___: cp
	"Python's printability rule, which both str.isprintable() and repr()
	are defined in terms of: a code point is NON-printable when its Unicode
	general category is one of Cc Cf Cs Co Cn (``other'') or Zl Zp Zs
	(``separator''), with ASCII space U+0020 the single exception -- it is a
	Zs yet counts as printable.

	The category comes from GemStone's Character>>unicodeCategory, which is
	libicu's u_charType and so tracks the real UCD.  That matters because the
	rule cannot be approximated by ranges: the old test here (cp < 32, or
	127 <= cp < 160) called U+00A0 NO-BREAK SPACE, U+200D ZERO WIDTH JOINER,
	U+2028 LINE SEPARATOR, U+3000 IDEOGRAPHIC SPACE, every private-use code
	point and every UNASSIGNED one printable.  Do NOT substitute
	Character>>isPrintable, which is a different predicate -- it reports the
	four separator/space cases above as printable.

	The ASCII fast path is not just an optimization: it keeps ordinary repr()
	off the libicu call entirely, so the common case costs a comparison."

	| cat |
	cp @env0:< 128 ifTrue: [^ (cp @env0:>= 32) @env0:and: [cp @env0:< 127]].
	cat := (Character @env0:codePoint: cp) @env0:unicodeCategory.
	((cat @env0:= #'Zs') @env0:or: [(cat @env0:= #'Zl') @env0:or: [cat @env0:= #'Zp']])
		ifTrue: [^ false].
	"Cc Cf Cs Co Cn -- the whole ``C'' (other) group is non-printable."
	^ (cat @env0:at: 1) @env0:~= $C
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isprintable
	"Return True if all characters are printable.  An empty string is
	printable, as in CPython."

	self @env0:do: [:char |
		(self ___pyIsPrintableCodePoint___: char @env0:codePoint)
			ifFalse: [^ false]].
	^ true
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isspace
	"Return True if all characters are whitespace and there is at least one character."

	| isEmpty allSpace |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [ ^ false ].

	allSpace := true.
	self @env0:do: [:char |
		(self ___isPySpaceCodePoint___: char @env0:codePoint)
			ifFalse: [ allSpace := false ].
	].
	^ allSpace
%

category: 'Grail-String Test Methods'
method: CharacterCollection
___isPySpaceCodePoint___: cp
	"CPython's str.isspace() is true for a codepoint in Unicode category
	Zs or with bidirectional class WS, B or S -- a wider set than
	GemStone's ``Character>>isSeparator'', which stops at the ASCII
	separators plus NBSP.  ``'　'.isspace()'' (IDEOGRAPHIC SPACE)
	was False without this (test_bool.py test_string).  Enumerated
	rather than table-driven: the whole set is 29 codepoints and does
	not move between Unicode releases."

	"ASCII: TAB LF VT FF CR, the FS/GS/RS/US information separators, SPACE."
	(cp @env0:between: 9 and: 13) ifTrue: [^ true].
	(cp @env0:between: 28 and: 32) ifTrue: [^ true].
	cp @env0:< 127 ifTrue: [^ false].
	"NEXT LINE, NO-BREAK SPACE, OGHAM SPACE MARK."
	((cp @env0:= 133) or: [(cp @env0:= 160) or: [cp @env0:= 5760]]) ifTrue: [^ true].
	"EN QUAD .. HAIR SPACE (U+2000..U+200A)."
	(cp @env0:between: 8192 and: 8202) ifTrue: [^ true].
	"LINE/PARAGRAPH SEPARATOR, NARROW NO-BREAK SPACE, MEDIUM MATHEMATICAL
	SPACE, IDEOGRAPHIC SPACE."
	^ (cp @env0:= 8232) or: [(cp @env0:= 8233)
		or: [(cp @env0:= 8239) or: [(cp @env0:= 8287) or: [cp @env0:= 12288]]]]
%

category: 'Grail-String Test Methods'
method: CharacterCollection
istitle
	"Return True if the string is titlecased and has at least one cased
	character: an uppercase character may only follow an uncased one and a
	lowercase character only a cased one.  ``''.istitle()'' and
	``'\n'.istitle()'' are False -- there is nothing cased to be titled."

	| cased previousCased |
	cased := false.
	previousCased := false.
	self @env0:do: [:char |
		char @env0:isUppercase
			ifTrue: [
				previousCased ifTrue: [^ false].
				previousCased := true.
				cased := true]
			ifFalse: [
				char @env0:isLowercase
					ifTrue: [
						previousCased ifFalse: [^ false].
						previousCased := true.
						cased := true]
					ifFalse: [previousCased := false]]].
	^ cased
%

category: 'Grail-String Test Methods'
method: CharacterCollection
isupper
	"Return True if all cased characters are uppercase and there is at least one cased character."

	| hasCased allUpper |
	hasCased := false.
	allUpper := true.
	self @env0:do: [:char |
		| isLetter isUpper |
		isLetter := char @env0:isLetter.
		isLetter ifTrue: [
			hasCased := true.
			isUpper := char @env0:isUppercase.
			isUpper ifFalse: [ allUpper := false ].
		].
	].
	^ hasCased @env0:& allUpper
%

category: 'Grail-String Methods'
method: CharacterCollection
join: iterable
	"Concatenate any number of strings with self as separator.
	Uses the Python iterator protocol (__iter__ / __next__) so it
	works for PythonGenerator and other lazy sequences that don't
	implement Smalltalk's ``do:``."

	| stream first iter done item pieces plain index |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	first := true.
	iter := iterable __iter__.
	done := false.
	index := 0.
	[done] @env0:whileFalse: [
		[
			item := iter __next__.
			first ifFalse: [stream @env0:nextPutAll: self].
			"A non-str item is CPython's TypeError; handed to the stream it
			was an uncatchable MessageNotUnderstood (``a SmallInteger does not
			understand #do:'')."
			item @env0:___isPyStr___ ifFalse: [
				^ TypeError ___signal___: 'sequence item '
					@env0:, index @env0:printString
					@env0:, ': expected str instance, '
					@env0:, (bytes ___pyTypeNameOf___: item) @env0:, ' found'].
			index := index @env0:+ 1.
			plain := item @env0:___pyPlainStr___.
			plain @env0:== nil
				ifTrue: [
					"This piece holds a code point no Character can carry, so the
					rest of the result has to be assembled out of CODE POINTS.  Set
					the stream aside and keep going, exactly as
					___formatString___ does for the same reason.  Before this,
					``'-'.join(parts)'' over a surrogateescape'd path element died
					in Unicode7>>addAll: as an UNCATCHABLE doesNotUnderstand."
					pieces @env0:isNil ifTrue: [pieces := OrderedCollection @env0:new].
					pieces @env0:add: stream @env0:contents.
					pieces @env0:add: item.
					stream := WriteStream @env0:on: (Unicode7 ___new___)]
				ifFalse: [stream @env0:nextPutAll: plain].
			first := false.
		] @env0:on: StopIteration do: [:ex | done := true].
	].
	pieces @env0:isNil ifTrue: [^ stream @env0:contents].
	"___fromCodePoints___ demotes back to an ordinary string when nothing in
	the result was actually a surrogate after all."
	pieces @env0:add: stream @env0:contents.
	^ PyStrSurrogate @env0:___fromCodePoints___: (self ___codePointsOfAll___: pieces)
%

category: 'Grail-String Methods'
method: CharacterCollection
ljust: width
	"str.ljust(width) -- left-justified, padded with spaces."

	^ self ___padLeftJustified___: width fill: $ 
%

category: 'Grail-String Methods'
method: CharacterCollection
ljust: width _: fillchar
	"str.ljust(width, fillchar)."

	^ self ___padLeftJustified___: width
		fill: (self ___fillCharacterOf___: fillchar)
%

category: 'Grail-String Methods'
method: CharacterCollection
lower
	"Return a copy of the string with all characters converted to lowercase,
	including multi-character SpecialCasing expansions (İ->i̇)."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ lower].
	^ self ___applyFullCase___: false
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyTrimLeft___
	"self with leading PYTHON whitespace removed -- see ___pyTrimRight___."

	| size i |
	size := self @env0:size.
	i := 1.
	[i @env0:<= size and: [self ___isPySpaceCodePoint___: (self @env0:at: i) @env0:codePoint]]
		@env0:whileTrue: [i := i @env0:+ 1].
	^ i @env0:= 1 ifTrue: [self] ifFalse: [self @env0:copyFrom: i to: size]
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyTrimRight___
	"self with trailing PYTHON whitespace removed.

	The no-argument strip/lstrip/rstrip used GemStone's trimLeft/trimRight/
	trimBoth, whose idea of whitespace is neither CPython's subset nor its
	superset -- it is simply a DIFFERENT set.  It strips NUL and the other
	C0 controls, which str.isspace() says are not whitespace (difflib marks
	intraline changes with \\x00 and \\x01 sentinels precisely because an
	escaper will not touch them, and rstrip() ate the closing \\x01, so every
	marked-up run lost its </span>), and it leaves the non-Latin-1 space
	characters alone, which str.isspace() says ARE whitespace ('a\\u2003'
	kept its EM SPACE).  ___isPySpaceCodePoint___: is the set str.isspace()
	already uses, so both ends now agree with CPython."

	| j |
	j := self @env0:size.
	[j @env0:>= 1 and: [self ___isPySpaceCodePoint___: (self @env0:at: j) @env0:codePoint]]
		@env0:whileTrue: [j := j @env0:- 1].
	^ j @env0:= self @env0:size ifTrue: [self] ifFalse: [self @env0:copyFrom: 1 to: j]
%

category: 'Grail-String Methods'
method: CharacterCollection
lstrip
	"Return a copy of the string with leading whitespace removed."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ lstrip].
	^ self ___pyTrimLeft___
%

category: 'Grail-String Methods'
method: CharacterCollection
lstrip: chars
	"Return a copy with leading occurrences of any character in
	``chars'' removed.  None / nil means whitespace, matching
	Python's str.lstrip()."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ lstrip: chars].
	(chars == nil or: [chars == None])
		ifTrue: [^ self ___pyTrimLeft___].
	^ self @env0:___lstripChars___: chars
%

category: 'Grail-String Methods'
method: CharacterCollection
partition: sep
	"Split the string at the first occurrence of sep, return (before, sep, after)."

	| p index before after |
	p := self ___pyNeedle___: sep for: nil.
	(p @env0:~~ nil and: [p @env0:isEmpty])
		ifTrue: [^ ValueError ___signal___: 'empty separator'].
	index := p @env0:== nil
		ifTrue: [0]
		ifFalse: [self @env0:___pyFindString___: p startingAt: 1].
	(index == 0) ifTrue: [
		^ tuple @env0:with: self with: '' with: ''
	].

	"A miss answers the receiver itself, subclass and all, as CPython's does;
	a hit builds its pieces from an exact str -- see ___asExactStr___."
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ partition: sep].

	before := self @env0:copyFrom: 1 to: (index @env0:- 1).
	after := self @env0:copyFrom: (index @env0:+ p @env0:size) to: self @env0:size.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-String Methods'
method: CharacterCollection
removeprefix: prefix
	"If the string starts with prefix, return string[len(prefix):], otherwise return a copy."

	| starts p |
	"A prefix holding a surrogate cannot begin a surrogate-free string, so the
	string comes back unchanged -- and beginsWith: raises an UNCATCHABLE
	ArgumentTypeError if handed one.  So, for the same reason, is a non-str
	argument, which is therefore refused here with CPython's TypeError."
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ removeprefix: prefix].
	prefix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: 'removeprefix() argument must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: prefix)].
	p := prefix @env0:___pyPlainStr___.
	p @env0:== nil ifTrue: [^ self].
	starts := self @env0:beginsWith: p.
	starts ifTrue: [
		^ self @env0:copyFrom: ((p @env0:size) @env0:+ 1) to: self @env0:size
	].
	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
removesuffix: suffix
	"If the string ends with suffix, return string[:-len(suffix)], otherwise return a copy."

	| ends p |
	"See removeprefix:."
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ removesuffix: suffix].
	suffix @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: 'removesuffix() argument must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: suffix)].
	p := suffix @env0:___pyPlainStr___.
	p @env0:== nil ifTrue: [^ self].
	ends := self @env0:endsWith: p.
	ends ifTrue: [
		^ self @env0:copyFrom: 1 to: ((self @env0:size) @env0:- p @env0:size)
	].
	^ self
%

category: 'Grail-String Methods'
method: CharacterCollection
replace: old _: new
	"Return a copy with all occurrences of substring old replaced by new."

	^ self ___pyReplace___: old _: new _: nil
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyReplaceAll___: old _: new _: count
	"self.replace(old, new, count) where ``new'' holds a surrogate: the result
	cannot be a CharacterCollection, so it is assembled from the alternating
	pieces by code point.  ``old'' is a plain str here -- replace:_: has
	already answered self for a surrogate-bearing one.  A nil ``count''
	means every occurrence."

	| pieces pos idx m plainOld done |
	plainOld := old @env0:___pyPlainStr___.
	(plainOld @env0:isNil @env0:or: [plainOld @env0:isEmpty]) ifTrue: [
		"An empty ``old'' is CPython's insert-between-every-character form;
		leave it to the kernel rather than restate it here."
		^ self @env0:copyReplaceAll: old with: new].
	m := plainOld @env0:size.
	pieces := OrderedCollection @env0:new.
	pos := 1.
	done := 0.
	idx := self @env0:___pyFindString___: plainOld startingAt: pos.
	[idx @env0:> 0 @env0:and: [count @env0:isNil @env0:or: [done @env0:< count]]]
		@env0:whileTrue: [
			pieces @env0:add: (self @env0:copyFrom: pos to: idx @env0:- 1).
			pieces @env0:add: new.
			pos := idx @env0:+ m.
			done := done @env0:+ 1.
			idx := self @env0:___pyFindString___: plainOld startingAt: pos].
	pieces @env0:add: (self @env0:copyFrom: pos to: self @env0:size).
	^ PyStrSurrogate @env0:___fromCodePoints___: (self ___codePointsOfAll___: pieces)
%

category: 'Grail-String Methods'
method: CharacterCollection
replace: old _: new _: count
	"replace(old, new, count) -- replace at most ``count'' leftmost
	occurrences (negative count means all).  django's WSGIRequest
	path handling uses ``path_info.replace('/', '', 1)''.  A nil/None count
	is also ``all'': _replace:kw: passes nil when no count was given."

	| n |
	n := (count == nil or: [count == None])
		ifTrue: [nil]
		ifFalse: [count ___asIndex___].
	(n @env0:~~ nil and: [n @env0:< 0]) ifTrue: [n := nil].
	^ self ___pyReplace___: old _: new _: n
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyReplace___: old _: new _: count
	"str.replace(old, new[, count]); a nil ``count'' means every occurrence.

	Both arguments must be str: anything else used to reach copyReplaceAll:
	(silently unchanged for a non-str ``old'') or the kernel's Unicode
	primitives (an uncatchable ArgumentTypeError for a non-str ``new'').

	An empty ``old'' is CPython's insert-between-every-character form,
	``'abc'.replace('', '-', 2)'' == ``'-a-bc''' -- the kernel's
	copyReplaceAll: answers the receiver unchanged for it.

	``old'' holding a surrogate never occurs here, so the string is
	unchanged; a surrogate-bearing ``new'' has to be spliced in by code
	point (___pyReplaceAll___)."

	| po pn m stream pos idx done |
	old @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: 'replace() argument 1 must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: old)].
	new @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: 'replace() argument 2 must be str, not '
			@env0:, (bytes ___pyTypeNameOf___: new)].
	self @env0:___isExactPyStr___ ifFalse: [
		^ self ___asExactStr___ ___pyReplace___: old _: new _: count].
	po := old @env0:___pyPlainStr___.
	pn := new @env0:___pyPlainStr___.
	po @env0:== nil ifTrue: [^ self].
	(count @env0:~~ nil and: [count @env0:= 0]) ifTrue: [^ self].
	m := po @env0:size.
	(pn @env0:== nil and: [m @env0:> 0])
		ifTrue: [^ self ___pyReplaceAll___: old _: new _: count].
	m @env0:= 0 ifTrue: [
		pn @env0:== nil ifTrue: [^ self @env0:copyReplaceAll: old with: new].
		stream := WriteStream @env0:on: (Unicode7 @env0:new).
		stream @env0:nextPutAll: pn.
		done := 1.
		1 @env0:to: self @env0:size do: [:i |
			stream @env0:nextPut: (self @env0:at: i).
			(count @env0:== nil or: [done @env0:< count]) ifTrue: [
				stream @env0:nextPutAll: pn.
				done := done @env0:+ 1]].
		^ stream @env0:contents].
	count @env0:== nil ifTrue: [^ self @env0:copyReplaceAll: po with: pn].
	stream := WriteStream @env0:on: (Unicode7 @env0:new).
	pos := 1.
	done := 0.
	[done @env0:< count
		and: [(idx := self @env0:___pyFindString___: po startingAt: pos) @env0:> 0]]
		whileTrue: [
			stream @env0:nextPutAll: (self @env0:copyFrom: pos to: idx @env0:- 1).
			stream @env0:nextPutAll: pn.
			pos := idx @env0:+ m.
			done := done @env0:+ 1].
	done @env0:= 0 ifTrue: [^ self].
	stream @env0:nextPutAll: (self @env0:copyFrom: pos to: self @env0:size).
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
_replace: positional kw: kwargs
	"Varargs entry for ``replace(old, new[, count])'' -- ``count'' is
	accepted positionally or as a keyword (str.replace(old, new, count=N)).

	``old'' and ``new'' must be positional.  Reading them out of the array
	without checking its size was FATAL, not an error: a keyword-only call
	such as ``s.replace(old=x, new=y)'' arrives with an empty positional
	array, and ``at: 1'' on it is an OffsetError -- a VM-level failure that no
	``except'' can catch, ending the session with no traceback and no line
	number.

	It is reachable from ordinary library code.  jinja2's error reporting
	calls ``code.replace(co_name=...)'' on what it believes is a code object;
	Grail's ``compile'' answers source TEXT, so that lands here, and the gem
	dies while REPORTING an unrelated template error.

	CPython raises ``TypeError: str.replace() takes no keyword arguments'',
	and so does this now.  (CPython rejects a keyword ``count'' too; that
	spelling is kept working here because this implementation has always
	accepted it and callers may rely on it.  Tightening it is a separate
	decision and not this fix's to make.)"

	| size old new count |
	size := positional @env0:size.
	(size @env0:< 2) @env0:ifTrue: [
		((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:isEmpty @env0:not])
			@env0:ifTrue: [
				^ TypeError ___signal___:
					'str.replace() takes no keyword arguments'].
		^ TypeError ___signal___:
			'replace expected at least 2 arguments, got '
				@env0:, (size @env0:printString)].
	old := positional @env0:at: 1.
	new := positional @env0:at: 2.
	count := (size @env0:>= 3)
		@env0:ifTrue: [positional @env0:at: 3]
		@env0:ifFalse: [((kwargs @env0:isNil @env0:not) @env0:and: [kwargs @env0:includesKey: 'count'])
			@env0:ifTrue: [kwargs @env0:at: 'count'] @env0:ifFalse: [nil]].
	"nil count (neither positional nor keyword) -> replace all, matching the
	2-arg form; the 3-arg form also treats nil/None/negative as ``all''."
	^ self replace: old _: new _: count
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub
	"Return the highest index where substring sub is found, or -1 if not found."

	^ self ___pyFind___: sub start: nil end: nil reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub _: start
	^ self ___pyFind___: sub start: start end: nil reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
rfind: sub _: start _: stop
	"rfind(sub, start, stop) -- highest 0-based index of ``sub'' within
	the [start, stop) slice, or -1.  Negative indices wrap."

	^ self ___pyFind___: sub start: start end: stop reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
_rfind: positional kw: kwargs
	"Varargs entry for ``rfind(sub[, start[, stop]])''."

	| sub |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'rfind() takes at least 1 argument'
	].
	self ___pyCheckArity___: positional max: 3 name: 'rfind'.
	sub := positional @env0:at: 1.
	positional @env0:size @env0:= 1 ifTrue: [^ self rfind: sub].
	positional @env0:size @env0:= 2 ifTrue: [
		^ self rfind: sub _: (positional @env0:at: 2)].
	^ self rfind: sub _: (positional @env0:at: 2) _: (positional @env0:at: 3)
%

category: 'Grail-String Methods'
method: CharacterCollection
rindex: sub
	"Return the highest index where substring sub is found. Raises ValueError if not found."

	^ self ___pyIndex___: sub start: nil end: nil reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
rindex: sub _: start
	"rindex(sub, start) -- like rfind, ValueError if absent."

	^ self ___pyIndex___: sub start: start end: nil reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
rindex: sub _: start _: stop
	"rindex(sub, start, stop) -- highest 0-based index of ``sub'' within
	the [start, stop) slice; ValueError if absent.  html.parser relies on
	the sliced form, so a 1-arg-only rindex breaks it on real input."

	^ self ___pyIndex___: sub start: start end: stop reverse: true
%

category: 'Grail-String Methods'
method: CharacterCollection
_rindex: positional kw: kwargs
	"Varargs entry for ``rindex(sub[, start[, stop]])''."

	| sub |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'rindex() takes at least 1 argument'
	].
	self ___pyCheckArity___: positional max: 3 name: 'rindex'.
	sub := positional @env0:at: 1.
	positional @env0:size @env0:= 1 ifTrue: [^ self rindex: sub].
	positional @env0:size @env0:= 2 ifTrue: [
		^ self rindex: sub _: (positional @env0:at: 2)].
	^ self rindex: sub _: (positional @env0:at: 2) _: (positional @env0:at: 3)
%

category: 'Grail-String Methods'
method: CharacterCollection
rjust: width
	"str.rjust(width) -- right-justified, padded with spaces."

	^ self ___padRightJustified___: width fill: $ 
%

category: 'Grail-String Methods'
method: CharacterCollection
rjust: width _: fillchar
	"str.rjust(width, fillchar)."

	^ self ___padRightJustified___: width
		fill: (self ___fillCharacterOf___: fillchar)
%

category: 'Grail-String Methods'
method: CharacterCollection
rpartition: sep
	"Split the string at the last occurrence of sep, return (before, sep, after)."

	| p m n lastIndex before after |
	p := self ___pyNeedle___: sep for: nil.
	(p @env0:~~ nil and: [p @env0:isEmpty])
		ifTrue: [^ ValueError ___signal___: 'empty separator'].
	n := self @env0:size.
	m := p @env0:== nil ifTrue: [n @env0:+ 1] ifFalse: [p @env0:size].
	lastIndex := m @env0:> n
		ifTrue: [0]
		ifFalse: [self @env0:findLastSubString: p startingAt: n @env0:- m @env0:+ 1].

	(lastIndex == 0) ifTrue: [
		^ tuple @env0:with: '' with: '' with: self
	].

	"A miss answers the receiver itself, subclass and all, as CPython's does;
	a hit builds its pieces from an exact str -- see ___asExactStr___."
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ rpartition: sep].

	before := self @env0:copyFrom: 1 to: (lastIndex @env0:- 1).
	after := self @env0:copyFrom: (lastIndex @env0:+ m) to: n.
	^ tuple @env0:with: before with: sep with: after
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit
	"Return a list of words in the string, using whitespace as the delimiter (from right)."

	^ self ___pyRSplit___: nil max: -1
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit: sep
	"rsplit(sep) with no maxsplit."

	^ self ___pyRSplit___: sep max: -1
%

category: 'Grail-String Methods'
method: CharacterCollection
rsplit: sep _: maxsplit
	^ self ___pyRSplit___: sep max: maxsplit
%

category: 'Grail-String Methods'
method: CharacterCollection
_rsplit: positional kw: kwargs
	"Python ``str.rsplit(sep=None, maxsplit=-1)`` varargs entry
	(email._policybase's ``doc.rsplit('\n', 1)`` docstring surgery)."

	| args |
	args := self ___pySplitArgs___: positional kw: kwargs name: 'rsplit'.
	^ self ___pyRSplit___: (args @env0:at: 1) max: (args @env0:at: 2)
%

category: 'Grail-String Methods'
method: CharacterCollection
split: sep _: maxsplit
	^ self ___pySplit___: sep max: maxsplit
%

category: 'Grail-String Methods'
method: CharacterCollection
rstrip
	"Return a copy of the string with trailing whitespace removed."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ rstrip].
	^ self ___pyTrimRight___
%

category: 'Grail-String Methods'
method: CharacterCollection
rstrip: chars
	"Return a copy with trailing occurrences of any character in
	``chars'' removed.  None / nil means whitespace, matching
	Python's str.rstrip()."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ rstrip: chars].
	(chars == nil or: [chars == None])
		ifTrue: [^ self ___pyTrimRight___].
	^ self @env0:___rstripChars___: chars
%

category: 'Grail-String Methods'
method: CharacterCollection
split
	"Return a list of words in the string, using whitespace as the
	delimiter -- see ___pySplit___:max:.

	Answer an OrderedCollection -- the canonical Python ``list''
	surrogate -- not an Array: a returned Array broke
	``text.split() == wrap(...)'' comparisons (class-strict sequence
	__eq__) and would reject list mutations like append."

	^ self ___pySplit___: nil max: -1
%

category: 'Grail-String Methods'
method: CharacterCollection
split: sep
	"split(sep) - return a list of substrings using sep as the
	delimiter.  Multi-character separators are honoured.  An empty
	sep raises ValueError per CPython; None splits on whitespace."

	^ self ___pySplit___: sep max: -1
%

category: 'Grail-String Methods'
method: CharacterCollection
_split: positional kw: kwargs
	"Python ``str.split(sep=None, maxsplit=-1)`` varargs entry.
	Grail jinja2's lexer hits the 2-arg form via the call-site
	``source.split('\\n')`` getting routed through the varargs
	dispatch (the static caller doesn't see the receiver is a str
	at compile time)."

	| args |
	args := self ___pySplitArgs___: positional kw: kwargs name: 'split'.
	^ self ___pySplit___: (args @env0:at: 1) max: (args @env0:at: 2)
%

category: 'Grail-String Methods'
method: CharacterCollection
___pySplitSeparator___: sep
	"The plain separator for split/rsplit: nil when it holds a surrogate (it
	cannot occur here, so the whole string is the one piece), CPython's
	TypeError for a non-str and ValueError for an empty one."

	| p |
	sep @env0:___isPyStr___ ifFalse: [
		^ TypeError ___signal___: 'must be str or None, not '
			@env0:, (bytes ___pyTypeNameOf___: sep)].
	p := sep @env0:___pyPlainStr___.
	(p @env0:~~ nil and: [p @env0:isEmpty])
		ifTrue: [^ ValueError ___signal___: 'empty separator'].
	^ p
%

category: 'Grail-String Methods'
method: CharacterCollection
___pySplitLimit___: maxsplit
	"How many splits split/rsplit may make: maxsplit coerced through
	__index__, with a negative (or absent) one meaning ``no limit'' -- one
	more than the receiver could ever need."

	| k |
	(maxsplit == nil or: [maxsplit == None])
		ifTrue: [^ self @env0:size @env0:+ 1].
	k := maxsplit ___asIndex___.
	k @env0:< 0 ifTrue: [^ self @env0:size @env0:+ 1].
	^ k
%

category: 'Grail-String Methods'
method: CharacterCollection
___isPySpaceAt___: i
	"str.isspace() for the character at 1-based ``i'', answering the
	printable-ASCII majority without the full table lookup."

	| cp |
	cp := (self @env0:at: i) @env0:codePoint.
	(cp @env0:> 32 and: [cp @env0:< 127]) ifTrue: [^ false].
	^ self ___isPySpaceCodePoint___: cp
%

category: 'Grail-String Methods'
method: CharacterCollection
___pySplit___: sep max: maxsplit
	"str.split(sep, maxsplit), after CPython's split / split_whitespace.

	With no separator, runs of str.isspace() characters separate the words,
	leading and trailing whitespace produce no empty words, and once
	maxsplit is used up the REMAINDER is kept verbatim (its own internal and
	trailing whitespace included) -- ``'  a  b c '.split(None, 1)'' is
	``['a', 'b c ']''.  The earlier implementation split fully and rejoined
	the tail with single spaces, and read a positional None separator as
	the string 'None'.

	Pieces are copyFrom:to: of the receiver so they keep its str class."

	| n max result i j p m idx |
	self @env0:___isExactPyStr___ ifFalse: [
		^ self ___asExactStr___ ___pySplit___: sep max: maxsplit].
	n := self @env0:size.
	result := OrderedCollection @env0:new.
	(sep == nil or: [sep == None]) ifTrue: [
		max := self ___pySplitLimit___: maxsplit.
		i := 1.
		[max @env0:> 0] whileTrue: [
			[i @env0:<= n and: [self ___isPySpaceAt___: i]] whileTrue: [i := i @env0:+ 1].
			i @env0:> n ifTrue: [^ result].
			j := i.
			[i @env0:<= n and: [(self ___isPySpaceAt___: i) @env0:not]]
				whileTrue: [i := i @env0:+ 1].
			result @env0:add: (self @env0:copyFrom: j to: i @env0:- 1).
			max := max @env0:- 1].
		[i @env0:<= n and: [self ___isPySpaceAt___: i]] whileTrue: [i := i @env0:+ 1].
		i @env0:<= n ifTrue: [result @env0:add: (self @env0:copyFrom: i to: n)].
		^ result].
	p := self ___pySplitSeparator___: sep.
	max := self ___pySplitLimit___: maxsplit.
	p @env0:== nil ifTrue: [result @env0:add: self. ^ result].
	m := p @env0:size.
	i := 1.
	[max @env0:> 0
		and: [(i @env0:+ m @env0:- 1) @env0:<= n
		and: [(idx := self @env0:___pyFindString___: p startingAt: i) @env0:> 0]]]
		whileTrue: [
			result @env0:add: (self @env0:copyFrom: i to: idx @env0:- 1).
			i := idx @env0:+ m.
			max := max @env0:- 1].
	result @env0:add: (self @env0:copyFrom: i to: n).
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyRSplit___: sep max: maxsplit
	"str.rsplit(sep, maxsplit): ___pySplit___:max: working from the right,
	after CPython's rsplit / rsplit_whitespace.  Separators are matched
	right to left, so ``'abbbc'.rsplit('bb')'' is ``['ab', 'c']'' where a
	left-to-right split gives ``['a', 'bc']'', and the unsplit HEAD keeps its
	leading whitespace.  The earlier implementation took a left split and
	re-joined its head, so it got both wrong.

	Pieces are collected right to left with add: and reversed ONCE on the
	way out (___pyReversed___:): addFirst: shifts the collection, which made
	``text.rsplit()'' quadratic -- 3.6s for a 1 MB string."

	| n max result i j p m idx |
	self @env0:___isExactPyStr___ ifFalse: [
		^ self ___asExactStr___ ___pyRSplit___: sep max: maxsplit].
	n := self @env0:size.
	result := OrderedCollection @env0:new.
	(sep == nil or: [sep == None]) ifTrue: [
		max := self ___pySplitLimit___: maxsplit.
		i := n.
		[max @env0:> 0] whileTrue: [
			[i @env0:>= 1 and: [self ___isPySpaceAt___: i]] whileTrue: [i := i @env0:- 1].
			i @env0:< 1 ifTrue: [^ self ___pyReversed___: result].
			j := i.
			[i @env0:>= 1 and: [(self ___isPySpaceAt___: i) @env0:not]]
				whileTrue: [i := i @env0:- 1].
			result @env0:add: (self @env0:copyFrom: i @env0:+ 1 to: j).
			max := max @env0:- 1].
		[i @env0:>= 1 and: [self ___isPySpaceAt___: i]] whileTrue: [i := i @env0:- 1].
		i @env0:>= 1 ifTrue: [result @env0:add: (self @env0:copyFrom: 1 to: i)].
		^ self ___pyReversed___: result].
	p := self ___pySplitSeparator___: sep.
	max := self ___pySplitLimit___: maxsplit.
	p @env0:== nil ifTrue: [result @env0:add: self. ^ result].
	m := p @env0:size.
	j := n.
	[max @env0:> 0
		and: [j @env0:>= m
		and: [(idx := self @env0:findLastSubString: p startingAt: j @env0:- m @env0:+ 1) @env0:> 0]]]
		whileTrue: [
			result @env0:add: (self @env0:copyFrom: idx @env0:+ m to: j).
			j := idx @env0:- 1.
			max := max @env0:- 1].
	result @env0:add: (self @env0:copyFrom: 1 to: j).
	^ self ___pyReversed___: result
%

category: 'Grail-String Methods'
method: CharacterCollection
___pyReversed___: anOrderedCollection
	"A new OrderedCollection (a Python list) holding anOrderedCollection's
	elements last to first."

	| out |
	out := OrderedCollection @env0:new: anOrderedCollection @env0:size.
	anOrderedCollection @env0:reverseDo: [:each | out @env0:add: each].
	^ out
%

category: 'Grail-String Methods'
method: CharacterCollection
___pySplitArgs___: positional kw: kwargs name: name
	"{ sep. maxsplit } for the varargs split/rsplit entries.  More than two
	positionals is CPython's TypeError -- reading only the first two let
	``'hello'.split(42, 42, 42)'' answer a list."

	| sep maxsplit |
	positional @env0:size @env0:> 2 ifTrue: [
		^ TypeError ___signal___: name @env0:, '() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)'].
	sep := nil.
	maxsplit := -1.
	positional @env0:isEmpty ifFalse: [
		sep := positional @env0:at: 1.
		positional @env0:size @env0:>= 2 ifTrue: [
			maxsplit := positional @env0:at: 2
		].
	].
	kwargs @env0:isNil ifFalse: [
		sep := kwargs @env0:at: 'sep' ifAbsent: [sep].
		maxsplit := kwargs @env0:at: 'maxsplit' ifAbsent: [maxsplit].
	].
	^ Array @env0:with: sep with: maxsplit
%

category: 'Grail-String Methods'
method: CharacterCollection
splitlines
	"str.splitlines() -> list of lines, breaking at universal line
	boundaries, terminators dropped."

	^ self ___splitlinesKeepends: false
%

category: 'Grail-String Methods'
method: CharacterCollection
_splitlines: positional kw: kwargs
	"Python ``str.splitlines(keepends=False)'' varargs entry -- the twin of
	bytes >> _splitlines:kw:, which str never had.  Without it the KEYWORD
	spelling ``text.splitlines(keepends=True)'' reached the 0-argument
	``splitlines'' and raised ``splitlines() takes a different number of
	arguments (0 given)''.  argparse's RawDescriptionHelpFormatter._fill_text
	is written that way, so --help through any Raw* formatter died on it.

	An unknown keyword RAISES rather than being ignored, with CPython's
	message: ``'a'.splitlines(foo=1)'' is a TypeError there too."

	| keepends |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('splitlines() takes at most 1 argument ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	keepends := positional @env0:notEmpty
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [false].
	kwargs @env0:ifNotNil: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'keepends'
				@env0:ifTrue: [
					"CPython counts a positional AND a keyword for the same
					parameter as too many arguments, not as a duplicate."
					positional @env0:notEmpty ifTrue: [
						TypeError ___signal___:
							('splitlines() takes at most 1 argument ('
								@env0:, (positional @env0:size @env0:+ 1) @env0:printString
								@env0:, ' given)')].
					keepends := v]
				@env0:ifFalse: [TypeError ___signal___:
					('splitlines() got an unexpected keyword argument '''
						@env0:, key @env0:, '''')]]].
	^ self splitlines: keepends
%

category: 'Grail-String Methods'
method: CharacterCollection
splitlines: keepends
	"str.splitlines(keepends) -> list of lines; when keepends is truthy
	each line retains its terminator."

	| ke |
	ke := (keepends == true)
		or: [(keepends ~~ false) and: [(keepends ~~ nil)
			and: [(keepends ~~ None) and: [keepends ~~ 0]]]].
	^ self ___splitlinesKeepends: ke
%

category: 'Grail-String Methods'
method: CharacterCollection
___isLineBoundaryCode: cp
	"True for a Unicode code point that str.splitlines() treats as a line
	boundary: LF CR VT FF FS GS RS NEL LINE-SEP PARA-SEP."

	^ (cp @env0:= 10) or: [(cp @env0:= 13) or: [(cp @env0:= 11)
		or: [(cp @env0:= 12) or: [(cp @env0:= 28) or: [(cp @env0:= 29)
		or: [(cp @env0:= 30) or: [(cp @env0:= 133) or: [(cp @env0:= 8232)
		or: [cp @env0:= 8233]]]]]]]]]
%

category: 'Grail-String Methods'
method: CharacterCollection
___splitlinesKeepends: keepends
	"Shared splitlines engine.  Slices the receiver with copyFrom:to: so
	each line keeps the receiver's str class (Unicode7), preserves empty
	lines (unlike subStrings:), and treats CR+LF as one boundary."

	| n result start i cp termLen |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ ___splitlinesKeepends: keepends].
	n := self @env0:size.
	result := OrderedCollection @env0:new.
	start := 1.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		cp := (self @env0:at: i) @env0:asInteger.
		(self ___isLineBoundaryCode: cp) ifTrue: [
			termLen := 1.
			((cp @env0:= 13) and: [(i @env0:< n)
				and: [((self @env0:at: i @env0:+ 1) @env0:asInteger) @env0:= 10]])
				ifTrue: [termLen := 2].
			keepends
				ifTrue: [result @env0:add: (self @env0:copyFrom: start to: i @env0:+ termLen @env0:- 1)]
				ifFalse: [result @env0:add: (self @env0:copyFrom: start to: i @env0:- 1)].
			i := i @env0:+ termLen.
			start := i
		] ifFalse: [
			i := i @env0:+ 1
		]
	].
	start @env0:<= n ifTrue: [
		result @env0:add: (self @env0:copyFrom: start to: n)
	].
	^ result
%

category: 'Grail-String Methods'
method: CharacterCollection
startswith: prefix
	"Test whether string starts with the specified prefix.  An empty prefix
	is always a prefix (CPython) -- GemStone's beginsWith: returns false for
	an empty argument, so special-case it.

	A TUPLE of prefixes is CPython's ``starts with ANY of these'' form, and it
	is not a rarity: difflib's _mdiff dispatches its whole line-pairing state
	machine on ``s.startswith(('--?+', '--+', '- '))''.  bytes>>startswith:
	already accepted one; str did not, and handed the tuple straight to
	GemStone's beginsWith:, which answered an UNCATCHABLE ArgumentTypeError
	(``expected a CharacterCollection'') that no Python ``except'' could see.
	Each element is validated by the recursive single-prefix call, so a
	non-str element raises the same TypeError CPython raises."

	| plain |
	(prefix isKindOf: tuple) ifTrue: [
		1 @env0:to: (prefix @env0:size) do: [:ti |
			(self startswith: (prefix @env0:at: ti)) ifTrue: [^ true]].
		^ false].
	prefix @env0:___isPyStr___ ifFalse: [
		TypeError ___signal___:
			('startswith first arg must be str or a tuple of str, not '
				@env0:, (bytes ___pyTypeNameOf___: prefix))].
	"A prefix holding a surrogate cannot begin a surrogate-free string, so
	False is the answer -- and it is the only one available, since
	beginsWith: cannot be handed one."
	plain := prefix @env0:___pyPlainStr___.
	plain @env0:== nil ifTrue: [^ false].
	plain @env0:isEmpty ifTrue: [^ true].
	^ self @env0:beginsWith: plain
%

category: 'Grail-String Methods'
method: CharacterCollection
___boundedSlice___: start end: end
	"self[start:end] with CPython None / negative-index clamping -- shared by
	the bounded startswith/endswith forms (mirrors bytes>>___boundedSlice___)."

	| size s e |
	size := self @env0:size.
	s := start. e := end.
	(s @env0:== None) ifTrue: [s := 0].
	(e @env0:== None) ifTrue: [e := size].
	"Coerced through __index__ (PEP 357) AFTER the None defaulting and
	BEFORE the slice arithmetic below, which is env-0 and on a Python
	object is an uncatchable MessageNotUnderstood.  None must be
	resolved first: it is a legal bound here and has no __index__."
	s := s ___asIndex___. e := e ___asIndex___.
	s @env0:< 0 ifTrue: [s := (size @env0:+ s) @env0:max: 0].
	e @env0:< 0 ifTrue: [e := (size @env0:+ e) @env0:max: 0].
	e := e @env0:min: size. s := s @env0:min: size.
	e @env0:< s ifTrue: [e := s].
	^ self @env0:copyFrom: s @env0:+ 1 to: e
%

category: 'Grail-String Methods'
method: CharacterCollection
startswith: prefix _: start
	"str.startswith(prefix, start) -- test self[start:]."

	^ self startswith: prefix _: start _: None
%

category: 'Grail-String Methods'
method: CharacterCollection
startswith: prefix _: start _: end
	"str.startswith(prefix, start, end) -- test whether self[start:end] starts
	with prefix (CPython None / negative-index clamping).  A window whose
	start lies past its end matches nothing, not even an empty prefix --
	``''.startswith('', 1, 0)'' is False -- which the clamped slice alone
	cannot see; the slice still runs first so a bad prefix is refused."

	| w |
	((self ___boundedSlice___: start end: end) startswith: prefix) ifFalse: [^ false].
	w := self ___pyAdjust___: start end: end.
	^ (w @env0:at: 1) @env0:<= (w @env0:at: 2)
%

category: 'Grail-String Methods'
method: CharacterCollection
_startswith: positional kw: kwargs
	"Varargs form of startswith(prefix[, start[, end]]) -- reached via the
	BoundMethod fallback (getattr(s,'startswith')(...))."

	| prefix start end |
	positional @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___: 'startswith() takes at least 1 argument (0 given)'].
	positional @env0:size @env0:> 3 ifTrue: [
		TypeError ___signal___: ('startswith() takes at most 3 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	prefix := positional @env0:at: 1.
	start := (positional @env0:size @env0:>= 2) @env0:ifTrue: [positional @env0:at: 2] @env0:ifFalse: [None].
	end := (positional @env0:size @env0:>= 3) @env0:ifTrue: [positional @env0:at: 3] @env0:ifFalse: [None].
	^ self startswith: prefix _: start _: end
%

category: 'Grail-String Methods'
method: CharacterCollection
strip
	"Return a copy of the string with leading and trailing whitespace removed."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ strip].
	^ self ___pyTrimLeft___ ___pyTrimRight___
%

category: 'Grail-String Methods'
method: CharacterCollection
strip: chars
	"Return a copy with the characters in `chars' stripped from both
	ends.  None / nil means whitespace, matching Python's str.strip().
	Empty string strips nothing."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ strip: chars].
	(chars == nil or: [chars == None])
		ifTrue: [^ self ___pyTrimLeft___ ___pyTrimRight___].
	^ (self @env0:___lstripChars___: chars) @env0:___rstripChars___: chars
%

set compile_env: 0

category: 'Grail-String Methods'
method: CharacterCollection
___lstripChars___: chars
	"Helper: strip leading occurrences of any character in `chars'."

	| size i |
	size := self size.
	i := 1.
	[i <= size and: [chars includes: (self at: i)]] whileTrue: [
		i := i + 1].
	^ i = 1 ifTrue: [self] ifFalse: [self copyFrom: i to: size]
%

category: 'Grail-String Methods'
method: CharacterCollection
___rstripChars___: chars
	"Helper: strip trailing occurrences of any character in `chars'."

	| size i |
	size := self size.
	i := size.
	[i >= 1 and: [chars includes: (self at: i)]] whileTrue: [
		i := i - 1].
	^ i = size ifTrue: [self] ifFalse: [self copyFrom: 1 to: i]
%

set compile_env: 1

category: 'Grail-String Methods'
method: CharacterCollection
swapcase
	"Return a copy with uppercase characters converted to lowercase and vice versa."

	| stream |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	self @env0:do: [:char |
		| isUpper |
		isUpper := char @env0:isUppercase.
		isUpper ifTrue: [
			stream @env0:nextPut: (char @env0:asLowercase)
		] ifFalse: [
			stream @env0:nextPut: (char @env0:asUppercase)
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
title
	"Return a titlecased version of the string where words start with uppercase."

	| stream inWord |
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	inWord := false.
	self @env0:do: [:char |
		| isAlpha |
		isAlpha := char @env0:isLetter.
		isAlpha ifTrue: [
			inWord ifTrue: [
				stream @env0:nextPut: (char @env0:asLowercase)
			] ifFalse: [
				stream @env0:nextPut: (char @env0:asUppercase).
				inWord := true.
			]
		] ifFalse: [
			stream @env0:nextPut: char.
			inWord := false.
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
translate: table
	"Return a copy with each character mapped through the translation
	table.  ``table`` is a mapping from int (Unicode codepoint) to
	either a replacement string, an int (codepoint), or None
	(delete).  Codepoints not in the table pass through unchanged.

	Implementation: walks the receiver once, looks up each char's
	codepoint via ``@env1:__getitem__:`` (so dict / KVD / any object
	implementing the mapping protocol works), and appends the
	replacement to an output stream."

	| stream |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	self @env0:do: [:ch |
		| cp replacement |
		cp := ch @env0:codePoint.
		replacement := [table __getitem__: cp]
			@env0:on: KeyError do: [:ex | ex @env0:return: ch].
		replacement == ch ifTrue: [stream @env0:nextPut: ch] ifFalse: [
			replacement == None ifFalse: [
				"A replacement no Character can hold -- a lone surrogate, as an
				int or inside a str -- makes the answer a PyStrSurrogate, which
				only the code-point implementation can build.  Streaming it
				died on an env-0 MessageNotUnderstood no Python code can catch."
				(((replacement isKindOf: Integer)
						and: [replacement @env0:>= 16rD800 and: [replacement @env0:<= 16rDFFF]])
					or: [replacement @env0:isKindOf: PyStrSurrogate]) ifTrue: [
						^ PyStrSurrogate ___translate___: self table: table].
				(replacement isKindOf: Integer) ifTrue: [
					stream @env0:nextPut: (Character @env0:codePoint: replacement)
				] ifFalse: [
					stream @env0:nextPutAll: replacement
				]
			]
		]
	].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
upper
	"Return a copy of the string with all characters converted to uppercase,
	including the multi-character SpecialCasing expansions (ß->SS, ﬅ->ST)."

	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ upper].
	^ self ___applyFullCase___: true
%

category: 'Grail-String Methods'
method: CharacterCollection
___applyFullCase___: toUpper
	"Full Unicode upper/lowercase.  GemStone asUppercase/asLowercase already
	does the simple 1:1 mappings correctly (incl. Kelvin, long-s, Cyrillic);
	this only adds the ~100 multi-character SpecialCasing expansions where a
	single code point maps to several (ß->SS, ﬅ->ST, İ->i̇).  Pure-ASCII
	(Unicode7) receivers take the fast path unchanged."

	| map stream needsExpand |
	(self @env0:isKindOf: Unicode7) ifTrue: [
		^ toUpper ifTrue: [self @env0:asUppercase] ifFalse: [self @env0:asLowercase]].
	map := toUpper ifTrue: [self ___multicharUpperMap___] ifFalse: [self ___multicharLowerMap___].
	needsExpand := false.
	self @env0:do: [:ch |
		(map @env0:includesKey: ch @env0:asInteger) ifTrue: [needsExpand := true]].
	needsExpand ifFalse: [
		^ toUpper ifTrue: [self @env0:asUppercase] ifFalse: [self @env0:asLowercase]].
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	self @env0:do: [:ch | | seq |
		seq := map @env0:at: ch @env0:asInteger ifAbsent: [nil].
		seq @env0:isNil
			ifTrue: [stream @env0:nextPut:
				(toUpper ifTrue: [ch @env0:asUppercase] ifFalse: [ch @env0:asLowercase])]
			ifFalse: [seq @env0:do: [:cp | stream @env0:nextPut: (Character @env0:codePoint: cp)]]].
	^ stream @env0:contents
%

category: 'Grail-String Methods'
method: CharacterCollection
___buildCaseMap___: flat
	"Build a code-point -> Array-of-code-points map from a flat integer
	array laid out as: key, count, cp1, ..., cpCount, key, count, ..."

	| d i n |
	d := Dictionary @env0:new.
	i := 1. n := flat @env0:size.
	[i @env0:<= n] @env0:whileTrue: [ | key cnt seq |
		key := flat @env0:at: i.
		cnt := flat @env0:at: i @env0:+ 1.
		seq := Array @env0:new: cnt.
		1 @env0:to: cnt do: [:j | seq @env0:at: j put: (flat @env0:at: i @env0:+ 1 @env0:+ j)].
		d @env0:at: key put: seq.
		i := i @env0:+ 2 @env0:+ cnt].
	^ d
%

category: 'Grail-String Methods'
method: CharacterCollection
___multicharUpperMap___
	"Cached multi-character uppercase SpecialCasing map (session-local)."

	| m st |
	st := SessionTemps @env0:current.
	m := st @env0:at: #'___GrailMcUpper___' otherwise: nil.
	m @env0:isNil ifTrue: [
		m := self ___buildCaseMap___: self ___multicharUpperData___.
		st @env0:at: #'___GrailMcUpper___' put: m].
	^ m
%

category: 'Grail-String Methods'
method: CharacterCollection
___multicharLowerMap___
	"Cached multi-character lowercase SpecialCasing map (session-local)."

	| m st |
	st := SessionTemps @env0:current.
	m := st @env0:at: #'___GrailMcLower___' otherwise: nil.
	m @env0:isNil ifTrue: [
		m := self ___buildCaseMap___: self ___multicharLowerData___.
		st @env0:at: #'___GrailMcLower___' put: m].
	^ m
%

category: 'Grail-String Methods'
method: CharacterCollection
___multicharLowerData___
	"GENERATED (CPython 3.14 str.lower multi-char mappings): İ -> i + combining dot."

	^ #(304 2 105 775)
%

category: 'Grail-String Methods'
method: CharacterCollection
___multicharUpperData___
	"GENERATED (CPython 3.14 str.upper multi-char SpecialCasing mappings).
	Flat: key, count, cp1..cpCount, ...  See scripts/generate_grail_case_tables.py."

	^ #(
		223 2 83 83 329 2 700 78 496 2 74 780 912 3 921 776 769 944 3 933 776 769 1415 2
		1333 1362 7830 2 72 817 7831 2 84 776 7832 2 87 778 7833 2 89 778 7834 2 65 702 8016
		2 933 787 8018 3 933 787 768 8020 3 933 787 769 8022 3 933 787 834 8064 2 7944 921
		8065 2 7945 921 8066 2 7946 921 8067 2 7947 921 8068 2 7948 921 8069 2 7949 921 8070
		2 7950 921 8071 2 7951 921 8072 2 7944 921 8073 2 7945 921 8074 2 7946 921 8075 2
		7947 921 8076 2 7948 921 8077 2 7949 921 8078 2 7950 921 8079 2 7951 921 8080 2 7976
		921 8081 2 7977 921 8082 2 7978 921 8083 2 7979 921 8084 2 7980 921 8085 2 7981 921
		8086 2 7982 921 8087 2 7983 921 8088 2 7976 921 8089 2 7977 921 8090 2 7978 921 8091
		2 7979 921 8092 2 7980 921 8093 2 7981 921 8094 2 7982 921 8095 2 7983 921 8096 2
		8040 921 8097 2 8041 921 8098 2 8042 921 8099 2 8043 921 8100 2 8044 921 8101 2 8045
		921 8102 2 8046 921 8103 2 8047 921 8104 2 8040 921 8105 2 8041 921 8106 2 8042 921
		8107 2 8043 921 8108 2 8044 921 8109 2 8045 921 8110 2 8046 921 8111 2 8047 921 8114
		2 8122 921 8115 2 913 921 8116 2 902 921 8118 2 913 834 8119 3 913 834 921 8124 2
		913 921 8130 2 8138 921 8131 2 919 921 8132 2 905 921 8134 2 919 834 8135 3 919 834
		921 8140 2 919 921 8146 3 921 776 768 8147 3 921 776 769 8150 2 921 834 8151 3 921
		776 834 8162 3 933 776 768 8163 3 933 776 769 8164 2 929 787 8166 2 933 834 8167 3
		933 776 834 8178 2 8186 921 8179 2 937 921 8180 2 911 921 8182 2 937 834 8183 3 937
		834 921 8188 2 937 921 64256 2 70 70 64257 2 70 73 64258 2 70 76 64259 3 70 70 73
		64260 3 70 70 76 64261 2 83 84 64262 2 83 84 64275 2 1348 1350 64276 2 1348 1333
		64277 2 1348 1339 64278 2 1358 1350 64279 2 1348 1341)
%

category: 'Grail-String Methods'
method: CharacterCollection
zfill: width
	"Pad a numeric string with zeros on the left, to fill a field of the given width."

	| stream mySize padding hasSign firstChar |
	self @env0:___isExactPyStr___ ifFalse: [^ self ___asExactStr___ zfill: width].
	mySize := self @env0:size.
	(width @env0:<= mySize) ifTrue: [ ^ self ].

	"Check if string starts with + or -"
	hasSign := false.
	(mySize @env0:> 0) ifTrue: [
		firstChar := self @env0:first.
		hasSign := ((firstChar == $+) @env0:| (firstChar == $-)).
	].

	padding := (width @env0:- (mySize)).
	stream := WriteStream @env0:on: (Unicode7 ___new___).

	hasSign ifTrue: [
		stream @env0:nextPut: firstChar.
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: (self @env0:allButFirst).
	] ifFalse: [
		padding @env0:timesRepeat: [
			stream @env0:nextPut: $0
		].
		stream @env0:nextPutAll: self.
	].
	^ stream @env0:contents
%

set compile_env: 1
category: 'Grail-Pickle'
method: CharacterCollection
__getnewargs__
	"CPython's str.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The string itself, as a plain str -- CPython's str.__getnewargs__()
	answers (str(self),).

	It exists for PICKLING an immutable builtin's subclass.  ``class MySub(str)''
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- allocating a bare instance rebuilds an empty one.  Grail's
	pickle used to reduce any str subclass to a plain str, losing the class."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { self @env0:asString }
%

set compile_env: 0

! ===============================================================================
! Symbol -- a str whose Smalltalk hash is an IDENTITY hash
! ===============================================================================
! A GemStone Symbol is a String subclass, so it inherits every method above and
! satisfies ``isinstance(sym, str)''.  But ``Symbol >> hash'' (env 0) answers
! ``self identityHash'', NOT the Pearson content hash ``String >> hash'' answers
! -- Symbols are canonical, so identity IS equality for the VM, and
! SymbolDictionary / method lookup / symbol resolution are all built on that.
!
! Inherited into Python, that broke the hash/eq invariant CPython guarantees:
! CharacterCollection >> __hash__ is ``^ self @env0:hash'', so
!
!     #abc @env1:__hash__      ->  61570      (the identity hash)
!     'abc' @env1:__hash__     ->  6723039    (the content hash)
!     #abc @env1:__eq__: 'abc' ->  true       (equal, in BOTH directions)
!
! -- equal objects with different hashes.  PyDict (which also backs set and
! frozenset) buckets by __hash__ and matches by __eq__, so a Symbol key and the
! equal str land in DIFFERENT buckets and never meet:
!
!     d = {sym: 1};  d['abc']       ->  KeyError('abc')
!     {sym} & {'abc'}              ->  set()
!     len({sym: 1, 'abc': 2})      ->  2
!
! and, worse than an error, the miss is SIZE-DEPENDENT: in a one-entry dict the
! two hashes can land in the same bucket by luck (tableSize is small, and the
! bucket is ``hash \\ tableSize''), where __eq__ then matches and the lookup
! SUCCEEDS.  Measured on a leaked Symbol: the same probe answered 1 from a
! 1-entry dict and raised KeyError from a 65-entry one.  Code that works on a
! small dict silently starts missing as the dict grows.
!
! WHY FIX THE HASH RATHER THAN THE LEAK SITES.  PySysModules.gs already takes
! the per-site approach for ``sys.modules'', and every ORDINARY Python door was
! measured clean because of it (sys.modules keys, globals(), dir(), __dict__,
! __name__, f_locals, inspect.signature, enum member names, ... all answer
! genuine str).  But the Smalltalk/Python boundary is not a closed list: the
! ``gemstone'' interop module hands Python raw Smalltalk objects, and two of its
! routes leak Symbols today --
!
!     gemstone.mySymbolList[0]     iterating a SymbolDictionary yields Symbols
!     gemstone['SomeGlobal']       answers whatever the global holds
!
! -- and any future bridge answering a Smalltalk object adds another.  A
! hard-coded list of normalisation sites is defeated by the next one; making the
! VALUE behave is not.
!
! WHAT THIS DOES NOT TOUCH.  Only the env-1 (Python) ``__hash__'' is overridden.
! Smalltalk's ``Symbol >> hash'' is untouched, so SymbolDictionary bucketing,
! ``Globals at: #Object'', symbol resolution and method lookup keep the identity
! hash they are built on.  Nothing outside Python's __hash__ protocol changes.
! ===============================================================================

set compile_env: 1

category: 'Grail-Hashing & Identity'
method: Symbol
__hash__
	"The CONTENT hash, so that Python's ``a == b implies hash(a) == hash(b)''
	holds between a Symbol and the equal str -- see the file comment above.

	``asString'' copies the Symbol into a plain String, whose ``hash'' is the
	Pearson content hash (String >> hash, <primitive: 31>); Symbol's own
	``hash'' override is what has to be stepped around, and a session method
	cannot declare the primitive itself (CompilePrimitives privilege).  Every
	string representation of the same characters hashes alike under Unicode
	comparison mode -- String, Unicode7, Unicode16 and Unicode32 all answer the
	same value -- so this is the str hash for a non-ASCII Symbol too, not only
	for an ASCII one.

	The copy costs one small allocation per hash, and only on the Symbol path:
	str / int / tuple keys never reach this method, so ordinary dict and set
	operations are unchanged."

	^ self @env0:asString @env0:hash
%

category: 'Grail-Conversion'
method: Symbol
__str__
	"``str(sym)'' answers a GENUINE str, the way CPython's str() of a str
	subclass answers exactly str.

	CharacterCollection >> __str__ answers ``self'', which for a Symbol handed
	back the Symbol -- so ``str(sym)'', the obvious way to launder one at the
	boundary, laundered nothing: type(str(sym)).__name__ still read 'Symbol'
	and the result was still INVARIANT, so ``str(sym).replace(...)'' still died
	with the uncatchable ``Attempt to modify invariant object''.

	str.__new__ answers a kernel-string argument's __str__ WITHOUT copying (it
	must: copying a wide Unicode16/32 into the narrow canonical class would
	corrupt it), so overriding __str__ here is what makes str(sym) a str."

	^ self @env0:asString @env0:asUnicodeString
%

set compile_env: 0

category: 'Grail-Interning'
method: Symbol
___pyInterned___
	"The session's CANONICAL str for this name: the same object every time, and
	the one sys.intern answers for an equal string.

	A namespace stores its string keys as Symbols and hands them to Python as
	strs, and each hand-over used to be a fresh ``asString''.  So two reads of
	one key were never ``is''-identical, and neither was a key pickle interned
	on load (test_pickle's test_attribute_name_interning) -- where CPython's
	attribute names are interned strings that ``is'' compares equal."

	^ self ___pyInternedAs___: self asString
%

category: 'Grail-Interning'
method: Symbol
___pyInternedAs___: aString
	"The canonical str for this Symbol, recording aString as it when there is
	none yet.  CPython's sys.intern answers its argument itself the first time,
	so aString is stored, not a copy.

	SESSION-LOCAL, like every other Grail cache of transient Python objects:
	the strings are session objects, and a persistent table would pin every
	name ever interned."

	| temps table |
	temps := SessionTemps current.
	table := temps at: #'___GrailInternedStrings___' otherwise: nil.
	table == nil ifTrue: [
		table := IdentityKeyValueDictionary new.
		temps at: #'___GrailInternedStrings___' put: table].
	^ table at: self ifAbsent: [table at: self put: aString]
%

set compile_env: 1

category: 'Grail-Introspection'
method: CharacterCollection
__dict__
	"``obj.__dict__'' for a str SUBCLASS instance -- the live dynamic-instVar
	view list and bytes publish.  A plain ``class X(str)'' stays a subclass of
	the kernel string class (Class.gs says why), so this is where its instances
	find it; ClassDefAst's stamp tells them from an EXACT str, which has no
	instance dict, as in CPython."

	(self @env0:class @env0:whichClassIncludesSelector: #'___pyDefinedClass___'
		environmentId: 1) @env0:isNil ifTrue: [
			^ AttributeError ___signal___: '''str'' object has no attribute ''__dict__'''].
	^ PyInstanceDict @env0:on: self
%

category: 'Grail-Type'
method: CharacterCollection
__class__
	"Python ``type(s)'' is ``str'' for every str.  GemStone picks the kernel
	class by CONTENT -- Unicode7 for ASCII, Unicode16 or Unicode32 once a wider
	code point appears -- and ``str'' is Unicode7, so without this override
	``type('\uc894') is str'' was False while its repr read ``<class 'str'>''.
	Every CJK codec test asserts ``type(result) is str'' on a decode
	(test_codecencodings_kr test_errorhandle).  Mirrors float >> __class__
	and int >> __class__.

	The same five kernel classes str >> __new__: treats as an exact str; any
	other class -- a ``class N(str)'', a str-mixin enum member -- is a
	subclass, and answers itself."

	| c |
	c := self @env0:class.
	((c @env0:== Unicode16)
		or: [(c @env0:== Unicode32)
		or: [(c @env0:== String)
		or: [c @env0:== Symbol]]]) ifTrue: [^ str].
	^ c
%

set compile_env: 0

! ___pythonValueAttrs___ is consulted through an ENV-0 ``respondsTo:'' in
! Object>>___pyAttrLoad___, so it must be an env-0 method.
category: 'Grail-Introspection'
classmethod: CharacterCollection
___pythonValueAttrs___
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself
%
