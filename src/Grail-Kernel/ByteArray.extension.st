Extension { #name : 'ByteArray' }

{ #category : 'Grail-Introspection' }
ByteArray class >> ___pythonValueAttrs___ [
	"Selectors ___pyAttrLoad___ must treat as VALUE attribute reads rather
	than BoundMethod wraps.  Without this, ``obj.__dict__'' on a bytes
	subclass answers a callable wrapper and ``.keys()'' on it fails."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray class >> ___stringFromCodePoints___: codePoints [
	"The str these decoded code points make -- a PyStrSurrogate when any of
	them is a lone surrogate, an ordinary string otherwise.

	THE ESCAPE CODECS CAN PRODUCE ONE, and that is the point of them:
	``b'\\ud800'.decode('unicode-escape')'' is U+D800 in CPython, which is how
	a repr round-trips a string holding one.  Building into a Unicode32
	stream could not express that -- ``Character codePoint:'' refuses a
	surrogate -- so the decoder died with an uncatchable OutOfRange (2723)
	the moment it reached such an escape.

	The ordinary case is unchanged in kind and pays one pass: no surrogate,
	no PyStrSurrogate."

	| anySurrogate out maxCp |
	anySurrogate := false.
	maxCp := 0.
	codePoints @env0:do: [:cp |
		((cp @env0:>= 16rD800) @env0:and: [cp @env0:<= 16rDFFF])
			ifTrue: [anySurrogate := true].
		cp @env0:> maxCp ifTrue: [maxCp := cp]].
	anySurrogate ifTrue: [
		^ PyStrSurrogate @env0:___fromCodePoints___: codePoints @env0:asArray].
	"THE NARROWEST CLASS THAT HOLDS THEM, as the strict decoder
	(decodeFromUTF8) and a source literal both choose: Unicode7 for ASCII,
	Unicode16 inside the BMP, Unicode32 beyond it.  Always building a Unicode32
	made ``str(b'ab', 'utf-8', 'surrogatepass')'' a different type from
	``'ab''', and ``type(a) is type(b)'' is a Python-visible question --
	test_pickle's test_unicode asks it of every string the unpickler builds."
	out := (maxCp @env0:< 128
		ifTrue: [Unicode7]
		ifFalse: [maxCp @env0:< 16r10000 ifTrue: [Unicode16] ifFalse: [Unicode32]])
			@env0:new: codePoints @env0:size.
	1 @env0:to: codePoints @env0:size do: [:k |
		out @env0:at: k put: (Character @env0:codePoint: (codePoints @env0:at: k))].
	^ out

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___decodeRawUnicodeEscape___ [
	"raw-unicode-escape decoder.  Pure env-0 helper called by decode:.

	Only \uXXXX and \UXXXXXXXX are escapes; every other byte -- backslash
	included -- is its own Latin-1 code point.  CPython consumes the byte
	AFTER a backslash unconditionally, which is what makes a doubled
	backslash inert: the second one is eaten as a literal, so the ``u'' that
	follows can no longer open an escape."

	| size cps i byte hexVal |
	size := self size.
	"WriteStream on a pre-sized Unicode32, for the reason spelled out in
	___decodeUnicodeEscape___: AppendStream would prepend ``size'' NULs."
	cps := OrderedCollection new.
	i := 1.
	[i <= size] whileTrue: [
		byte := self at: i.
		(byte = 92 and: [i < size]) ifTrue: [
			| next nDigits |
			next := self at: i + 1.
			nDigits := nil.
			(next = 117) ifTrue: [nDigits := 4].
			(next = 85) ifTrue: [nDigits := 8].
			nDigits == nil ifTrue: [
				"Not an escape: the backslash and the byte after it are both
				literal.  Consuming BOTH is the point -- see the comment above."
				cps add: (92).
				cps add: (next).
				i := i + 2
			] ifFalse: [
				| j avail |
				"Count the hex digits actually present, as CPython does, so a
				truncated escape is diagnosed rather than read past the end."
				j := i + 2.
				avail := 0.
				[avail < nDigits and: [j <= size and: [self ___isHexDigit___: (self at: j)]]]
					whileTrue: [avail := avail + 1. j := j + 1].
				(avail = nDigits) ifFalse: [
					^ self ___escapeDecodeError___: 'rawunicodeescape'
						from: i to: (j @env0:- 1 @env0:min: size)
						reason: ((next = 117)
							ifTrue: ['truncated \uXXXX escape']
							ifFalse: ['truncated \UXXXXXXXX escape'])].
				hexVal := self ___parseHex___: i + 2 length: nDigits.
				"Same out-of-range guard as the unicode-escape decoder above."
				hexVal @env0:> 16r10FFFF ifTrue: [
					"raw-unicode-escape words this differently from
					unicode-escape -- CPython's own asymmetry."
					^ self ___escapeDecodeError___: 'rawunicodeescape'
						from: i to: i + 1 + nDigits reason: '\Uxxxxxxxx out of range'].
				cps add: (hexVal).
				i := i + 2 + nDigits
			]
		] ifFalse: [
			cps add: (byte).
			i := i + 1
		]
	].
	^ bytes @env0:___stringFromCodePoints___: cps

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___decodeUnicodeEscape___ [
	"unicode-escape decoder.  Pure env-0 helper called by decode:."

	| size cps i byte |
	size := self size.
	"WriteStream, NOT AppendStream: the backing collection is pre-SIZED
	(``new: size'' is capacity, not emptiness).  WriteStream on: starts at
	position 0 and overwrites; AppendStream on: starts at the END, so every
	decoded string would carry ``size'' leading NULs.  In Unicode comparison
	mode that corruption is nearly invisible -- NUL is collation-ignorable, so
	the result still compares = to the clean string -- but its hash differs,
	which silently breaks dict lookups keyed by a decoded string (jinja2's
	lexer round-trips every string token through this decoder)."
	cps := OrderedCollection new.
	i := 1.
	[i <= size] whileTrue: [
		byte := self at: i.
		(byte = 92 and: [i < size]) ifTrue: [
			| next codeUnit hexN |
			next := self at: i + 1.
			"Simple single-char escapes."
			(next = 110) ifTrue: [cps add: (10).  i := i + 2] ifFalse: [
			(next = 116) ifTrue: [cps add: (9).   i := i + 2] ifFalse: [
			(next = 114) ifTrue: [cps add: (13).  i := i + 2] ifFalse: [
			(next = 98)  ifTrue: [cps add: (8).   i := i + 2] ifFalse: [
			(next = 102) ifTrue: [cps add: (12).  i := i + 2] ifFalse: [
			(next = 118) ifTrue: [cps add: (11).  i := i + 2] ifFalse: [
			(next = 97)  ifTrue: [cps add: (7).   i := i + 2] ifFalse: [
			(next = 92)  ifTrue: [cps add: (92).  i := i + 2] ifFalse: [
			(next = 39)  ifTrue: [cps add: (39).  i := i + 2] ifFalse: [
			(next = 34)  ifTrue: [cps add: (34).  i := i + 2] ifFalse: [
			"\\x — 2 hex digits."
			(next = 10) ifTrue: [
				"A BACKSLASH-NEWLINE IS A LINE CONTINUATION: both go.  It used
				to reach the unknown-escape arm below, which keeps the
				backslash and rescans, so ``b'[\\\\\\n]'.decode(...)'' answered
				'[\\\\\\n]' where CPython answers '[]'.

				LF ONLY.  CPython does not continue on CR or CRLF -- ``\\\\\\r''
				stays a literal backslash-CR -- so testing for 10 and not for
				13 is the rule rather than an omission."
				i := i + 2] ifFalse: [
			(next = 120) ifTrue: [
				hexN := self ___escapeHexAt___: i digits: 2
					reason: 'truncated \xXX escape' size: size.
				cps add: (hexN).
				i := i + 4
			] ifFalse: [
			"\\u — 4 hex digits."
			(next = 117) ifTrue: [
				codeUnit := self ___escapeHexAt___: i digits: 4
					reason: 'truncated \uXXXX escape' size: size.
				cps add: (codeUnit).
				i := i + 6
			] ifFalse: [
			"\\U — 8 hex digits."
			(next = 85) ifTrue: [
				codeUnit := self ___escapeHexAt___: i digits: 8
					reason: 'truncated \UXXXXXXXX escape' size: size.
				"ABOVE U+10FFFF IS NOT A CHARACTER.  ``\\U00110000'' parses to a
				perfectly good integer and then has nowhere to go: ``Character
				codePoint:'' refuses it, so the decoder died with an uncatchable
				OutOfRange (2723) where CPython raises.  The span is the whole
				escape, ten bytes."
				codeUnit @env0:> 16r10FFFF ifTrue: [
					^ self ___escapeDecodeError___: 'unicodeescape'
						from: i to: i + 9 reason: 'illegal Unicode character'].
				cps add: (codeUnit).
				i := i + 10
			] ifFalse: [
			"\\0..\\7 — octal up to 3 digits."
			(next >= 48 and: [next <= 55]) ifTrue: [
				| octVal j endIdx |
				octVal := 0.
				endIdx := (i + 4) min: size + 1.
				j := i + 1.
				[j < endIdx and: [(self at: j) >= 48 and: [(self at: j) <= 55]]]
					whileTrue: [
						octVal := (octVal * 8) + ((self at: j) - 48).
						j := j + 1].
				cps add: (octVal).
				i := j
			] ifFalse: [
				"Unknown escape — emit backslash literally and rescan from next."
				cps add: (92).
				i := i + 1
			]]]]]]]]]]]]]]]
		] ifFalse: [
			"A LONE TRAILING BACKSLASH IS AN ERROR here, though not in
			raw-unicode-escape, where a backslash that begins no escape is an
			ordinary byte.  The guard above (``i < size'') sends it to this
			arm, which used to emit it literally: ``b'a\\\\'.decode(
			'unicode-escape')'' answered 'a\\\\' where CPython raises."
			(byte = 92 and: [i = size]) ifTrue: [
				^ self ___escapeDecodeError___: 'unicodeescape'
					from: i to: size reason: '\ at end of string'].
			cps add: (byte).
			i := i + 1
		]
	].
	^ bytes @env0:___stringFromCodePoints___: cps

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___escapeDecodeError___: codecName from: oneBased to: lastIndex reason: aReason [
	"The UnicodeDecodeError an escape decoder raises, with POSITIONS.

	These raises carried a bare message, so ``exc.start'' answered nil --
	which is why bytes >> ___decodeSubstituting___ has to leave such codecs
	alone, and why ``replace'' on a bad escape still raised.  Giving them a
	range lets that loop handle them like any other codec.

	CPython names the codec WITHOUT hyphens here -- ``unicodeescape'', not
	``unicode-escape'' -- which is the codec's internal name rather than the
	alias the caller wrote, and is what the tests read back.

	The span runs from the backslash to the end of what was available,
	zero-based with an exclusive end."

	^ UnicodeDecodeError @env1:___signalNew___:
		{ codecName. self. oneBased @env0:- 1. lastIndex. aReason } kw: nil

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___escapeHexAt___: i digits: n reason: aReason size: size [
	"The value of the \\xXX / \\uXXXX / \\UXXXXXXXX escape beginning at the
	backslash ``i'', or a positioned UnicodeDecodeError.

	ONE RULE COVERS BOTH WAYS AN ESCAPE CAN FAIL.  It used to take two: a
	length check ahead of the escape (``are there enough bytes left?'') and
	___parseHex___ raising ``invalid hex digit in escape'' from inside when
	one of them was not hex.  CPython has no such distinction -- a
	non-hex digit is a TRUNCATED escape, ending where the digits stopped:

	    b'a\\uXYZW'  ->  unicodeescape|1|3|truncated \\uXXXX escape
	    b'a\\uD'     ->  unicodeescape|1|4|truncated \\uXXXX escape

	so scanning the digits that ARE there and reporting i+1+avail gives both
	answers from one count."

	| j avail |
	j := i + 2.
	avail := 0.
	[avail < n and: [j <= size and: [self ___isHexDigit___: (self at: j)]]]
		whileTrue: [avail := avail + 1. j := j + 1].
	avail = n ifFalse: [
		^ self ___escapeDecodeError___: 'unicodeescape'
			from: i to: i + 1 + avail reason: aReason].
	^ self ___parseHex___: i + 2 length: n

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___isHexDigit___: aByte [
	"True if aByte is an ASCII hex digit."

	^ (aByte >= 48 and: [aByte <= 57])
		or: [(aByte >= 97 and: [aByte <= 102])
		or: [aByte >= 65 and: [aByte <= 70]]]

]

{ #category : 'Grail-Encoding/Decoding' }
ByteArray >> ___parseHex___: startIdx length: n [
	"Parse n hex digits starting at byte index startIdx; return the integer value."

	| value byte digit |
	value := 0.
	1 to: n do: [:k |
		byte := self at: startIdx + k - 1.
		(byte >= 48 and: [byte <= 57]) ifTrue: [digit := byte - 48] ifFalse: [
		(byte >= 97 and: [byte <= 102]) ifTrue: [digit := byte - 87] ifFalse: [
		(byte >= 65 and: [byte <= 70]) ifTrue: [digit := byte - 55] ifFalse: [
			UnicodeDecodeError @env1:___signal___: 'invalid hex digit in escape']]].
		value := (value * 16) + digit
	].
	^ value

]
