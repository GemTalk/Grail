! ------------------- Superclass check
run
unicode_names ifNil: [self error: 'unicode_names is not defined. Check file ordering.'].
%

set compile_env: 0

! ------------------- Parsing the generated table

category: 'Grail-Unicode Names'
classmethod: unicode_names
___hexDigitValue: aChar
	"Value of one uppercase hex digit, or nil.  The generated table and the
	algorithmic suffixes are both uppercase hex by construction, so no
	lowercase branch is needed here -- ___codePointForName: upcases a
	caller's name before it gets this far."

	| c |
	c := aChar codePoint.
	(c >= 48 and: [c <= 57]) ifTrue: [^ c - 48].
	(c >= 65 and: [c <= 70]) ifTrue: [^ c - 55].
	^ nil
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___parseChunk: aString into: aDict
	"Scan one generated chunk -- ``NAME=HEX;NAME=HEX;...'' -- in a single
	pass.  Deliberately not subStrings:/collect:, which would build 34137
	intermediate Strings and two intermediate Arrays per chunk to answer
	the same dictionary."

	| i size nameStart eqPos cp |
	i := 1.
	size := aString size.
	[i <= size] whileTrue: [
		nameStart := i.
		[i <= size and: [(aString at: i) ~~ $=]] whileTrue: [i := i + 1].
		eqPos := i.
		i := i + 1.
		cp := 0.
		[i <= size and: [(aString at: i) ~~ $;]] whileTrue: [
			cp := (cp * 16) + (self ___hexDigitValue: (aString at: i)).
			i := i + 1].
		aDict at: (aString copyFrom: nameStart to: eqPos - 1) put: cp.
		i := i + 1].
	^ aDict
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___nameToCodePointMap
	"The explicit table, parsed once per session and cached.

	LAZY ON PURPOSE.  Most sessions never resolve a Unicode name -- it
	takes a ``\N{...}'' escape in source, a unicodedata.lookup(), or a
	``\N'' in a regex -- so the 34137 entries are built on first use rather
	than at install, and the class variable holds them for the rest of the
	session."

	| dict |
	NameToCp ifNotNil: [^ NameToCp].
	dict := StringKeyValueDictionary new.
	1 to: self ___chunkCount do: [:i |
		self ___parseChunk: (self perform: ('___nameChunk' , i printString) asSymbol)
			into: dict].
	"The control aliases go in HERE and nowhere else -- see
	___codePointToNameMap, which is built without them on purpose."
	self ___parseChunk: self ___aliasData into: dict.
	NameToCp := dict.
	^ dict
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___codePointToNameMap
	"The reverse map, and NOT simply the inverse of ___nameToCodePointMap:
	the control ALIASES are left out.

	An alias names a code point that has no name.  CPython keeps the two
	directions asymmetric for exactly that reason -- lookup('NULL')
	answers U+0000, while name(chr(0)) RAISES -- so inverting the forward
	map wholesale would have unicodedata.name() inventing names for every
	control character.  The fixture caught precisely that."

	| dict |
	CpToName ifNotNil: [^ CpToName].
	dict := KeyValueDictionary new.
	1 to: self ___chunkCount do: [:i | | chunk |
		chunk := StringKeyValueDictionary new.
		self ___parseChunk: (self perform: ('___nameChunk' , i printString) asSymbol)
			into: chunk.
		chunk keysAndValuesDo: [:each :cp | dict at: cp put: each]].
	CpToName := dict.
	^ dict
%

! ------------------- Algorithmic families: PREFIX-<own hex>

category: 'Grail-Unicode Names'
classmethod: unicode_names
___algorithmicCodePointForName: aName
	"``CJK UNIFIED IDEOGRAPH-4E2D'' and its five sibling families.

	The name must decode to the code point it NAMES -- the hex suffix is
	not an index into the range, it IS the answer -- so the check is that
	the decoded value falls inside a range belonging to that prefix.  That
	is what makes ``CJK UNIFIED IDEOGRAPH-0041'' correctly unknown."

	| idx prefix cp digit |
	idx := 0.
	aName size to: 1 by: -1 do: [:i |
		(idx = 0 and: [(aName at: i) == $-]) ifTrue: [idx := i]].
	idx = 0 ifTrue: [^ nil].
	((aName size - idx) between: 4 and: 6) ifFalse: [^ nil].
	prefix := aName copyFrom: 1 to: idx - 1.
	cp := 0.
	idx + 1 to: aName size do: [:i |
		digit := self ___hexDigitValue: (aName at: i).
		digit ifNil: [^ nil].
		cp := (cp * 16) + digit].
	self ___algorithmicRanges do: [:each |
		((each at: 1) = prefix
			and: [cp >= (each at: 2) and: [cp <= (each at: 3)]])
				ifTrue: [^ cp]].
	^ nil
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___algorithmicNameForCodePoint: aCodePoint
	"The inverse: the prefix of whichever range holds it, plus its own hex,
	four digits minimum and no ``16r'' -- which is why this formats the
	digits itself rather than using printString: 16."

	| remaining digits |
	self ___algorithmicRanges do: [:each |
		(aCodePoint >= (each at: 2) and: [aCodePoint <= (each at: 3)]) ifTrue: [
			digits := ''.
			remaining := aCodePoint.
			[remaining > 0] whileTrue: [
				digits := ((self ___hexDigits) at: (remaining \\ 16) + 1) asString , digits.
				remaining := remaining // 16].
			[digits size < 4] whileTrue: [digits := '0' , digits].
			^ (each at: 1) , '-' , digits]].
	^ nil
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___hexDigits
	"Uppercase, because Unicode names are."

	^ '0123456789ABCDEF'
%

! ------------------- Hangul syllables, composed from jamo

category: 'Grail-Unicode Names'
classmethod: unicode_names
___hangulPrefix
	^ 'HANGUL SYLLABLE '
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___hangulCodePointForName: aName
	"``HANGUL SYLLABLE GGWAELS'' -> its code point.

	The three parts run together with no separator and several are
	prefixes of others ('G' of 'GG', 'A' of 'AE'), so the split is found by
	SEARCH rather than by scanning: try every lead the name starts with,
	then every vowel the remainder starts with, and accept only when what
	is left is exactly a trail.  19 x 21 candidates at worst, and the empty
	trail means the check must be for equality, not for a prefix."

	| rest lead vowel trail |
	(aName size > self ___hangulPrefix size
		and: [(aName copyFrom: 1 to: self ___hangulPrefix size) = self ___hangulPrefix])
			ifFalse: [^ nil].
	rest := aName copyFrom: self ___hangulPrefix size + 1 to: aName size.
	lead := self ___hangulLead.
	vowel := self ___hangulVowel.
	trail := self ___hangulTrail.
	1 to: lead size do: [:li | | lp afterLead |
		lp := lead at: li.
		(rest size >= lp size
			and: [(rest copyFrom: 1 to: lp size) = lp]) ifTrue: [
				afterLead := rest copyFrom: lp size + 1 to: rest size.
				1 to: vowel size do: [:vi | | vp afterVowel |
					vp := vowel at: vi.
					(afterLead size >= vp size
						and: [(afterLead copyFrom: 1 to: vp size) = vp]) ifTrue: [
							afterVowel := afterLead copyFrom: vp size + 1 to: afterLead size.
							1 to: trail size do: [:ti |
								(afterVowel = (trail at: ti)) ifTrue: [
									^ 16rAC00 + ((li - 1) * 21 * 28)
										+ ((vi - 1) * 28) + (ti - 1)]]]]]].
	^ nil
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___hangulNameForCodePoint: aCodePoint
	"The inverse, by the standard decomposition of the syllable index."

	| i |
	(aCodePoint >= 16rAC00 and: [aCodePoint <= 16rD7A3]) ifFalse: [^ nil].
	i := aCodePoint - 16rAC00.
	^ self ___hangulPrefix
		, (self ___hangulLead at: (i // (21 * 28)) + 1)
		, (self ___hangulVowel at: (i // 28 \\ 21) + 1)
		, (self ___hangulTrail at: (i \\ 28) + 1)
%

! ------------------- The two answers everything else asks for

category: 'Grail-Unicode Names'
classmethod: unicode_names
___codePointForName: aName
	"Code point for a Unicode character name, or nil when there is none.

	Order is cheapest-first and the families do not overlap, so it is not
	significant beyond that: the explicit table is a single hash probe, and
	only a miss pays for the two computed families.

	Names match CASE-INSENSITIVELY, as the real UCD lookup does -- CPython
	accepts ``\N{latin small letter a}''.  Underscores are NOT accepted as
	spaces; CPython does not accept them either."

	| key cp |
	aName isNil ifTrue: [^ nil].
	key := aName asString asUppercase.
	cp := self ___nameToCodePointMap at: key otherwise: nil.
	cp ifNotNil: [^ cp].
	cp := self ___hangulCodePointForName: key.
	cp ifNotNil: [^ cp].
	^ self ___algorithmicCodePointForName: key
%

category: 'Grail-Unicode Names'
classmethod: unicode_names
___nameForCodePoint: aCodePoint
	"Name of a code point, or nil when it has none.  Unassigned code points
	and every control character have no name -- CPython raises ValueError
	for those, which is the caller's job to do."

	"``name'' is a class-side instance variable in GemStone, so a temp of
	that name is rejected outright -- hence ``found''."
	| found |
	found := self ___hangulNameForCodePoint: aCodePoint.
	found ifNotNil: [^ found].
	found := self ___algorithmicNameForCodePoint: aCodePoint.
	found ifNotNil: [^ found].
	^ self ___codePointToNameMap at: aCodePoint otherwise: nil
%

! ------------------- The Python-visible surface
!
! unicodedata.py imports this module and delegates, the same way
! stdlib .py modules already import struct / math / time.  Answers None
! rather than raising, so the Python side owns the KeyError / ValueError
! that CPython's API specifies.

set compile_env: 1

category: 'Grail-Unicode Names'
method: unicode_names
codepoint_for_name: aName
	"Python: unicode_names.codepoint_for_name(name) -> int or None."

	^ (unicode_names @env0:___codePointForName: aName) @env0:ifNil: [None]
%

category: 'Grail-Unicode Names'
method: unicode_names
name_for_codepoint: aCodePoint
	"Python: unicode_names.name_for_codepoint(cp) -> str or None."

	^ (unicode_names @env0:___nameForCodePoint: aCodePoint) @env0:ifNil: [None]
%

set compile_env: 0
