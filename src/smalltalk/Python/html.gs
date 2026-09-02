! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- html class (Python 'html' module)
expectvalue /Class
doit
module subclass: 'html'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
html comment:
'Python html module.

Provides functions for manipulating HTML.

Functions:
- escape(s, quote=True): Replace special characters with HTML entities.
- unescape(s): Convert HTML entities back to characters.

Submodule:
- entities: html.entities (name2codepoint, codepoint2name, entitydefs, html5).

See https://docs.python.org/3/library/html.html for documentation.
'
%

expectvalue /Class
doit
html category: 'Grail-Modules'
%

! ------------------- Remove existing Python methods from html
expectvalue /Metaclass3
doit
html removeAllMethods: 1.
html class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: html
initialize
	"Bind the html.entities submodule. The `entities` accessor reads
	this slot. This initialize is kept because `entities` is a stored
	attribute (a reference to another module instance), not a callable."

	self @env0:at: #entities put: (html_entities instance)
%

! ===============================================================================
! Submodule attribute (stored data, not a callable)
! ===============================================================================

category: 'Grail-Accessors'
method: html
entities
	"Return the html.entities submodule (stored attribute, populated by
	`initialize`)."
	^ self @env0:at: #entities
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: html
_escape: positional kw: kwargs
	"Python html.escape(s, quote=True) -- varargs entry.

	``quote'' is the documented spelling and the one everybody writes, and
	it had no entry at all: only the fixed-arity ``escape:'' and
	``escape:_:'' existed, so a POSITIONAL second argument worked and
	``html.escape(s, quote=False)'' answered ``escape() takes a different
	number of arguments''.  Found by the regression half of
	tests/python/html_unescape.py rather than by any test of escape."

	| s quote |
	positional @env0:isEmpty ifTrue: [
		^ TypeError ___signal___:
			'escape() missing 1 required positional argument: ''s'''].
	(positional @env0:size @env0:> 2) ifTrue: [
		^ TypeError ___signal___: ('escape() takes from 1 to 2 positional arguments but '
			@env0:, positional @env0:size @env0:printString @env0:, ' were given')].
	s := positional @env0:at: 1.
	quote := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs @env0:isNil
			ifTrue: [true]
			ifFalse: [kwargs @env0:at: 'quote' ifAbsent: [true]]].
	^ self escape: s _: quote
%

category: 'Grail-Escaping'
method: html
escape: s
	"Python html.escape(s) — fast path. 1-arg form: replaces
	&, <, >, and quotes (default `quote=True`) with HTML entities."

	^ self escape: s _: true
%

category: 'Grail-Built-in Functions'
method: html
escape: s _: quote
	"Python html.escape(s, quote) — fast path. 2-arg form.
	Replaces &, <, >, and (when quote is truthy) double and single
	quotes with HTML entities. & must be replaced first to avoid
	double-escaping."

	| result |
	result := s @env0:copyReplaceAll: '&' with: '&amp;'.
	result := result @env0:copyReplaceAll: '<' with: '&lt;'.
	result := result @env0:copyReplaceAll: '>' with: '&gt;'.
	quote ___isTruthy___ ifTrue: [
		result := result @env0:copyReplaceAll: '"' with: '&quot;'.
		result := result @env0:copyReplaceAll: '''' with: '&#x27;'.
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: html
unescape: s
	"Python html.unescape(s) -- CPython's algorithm, ported.

	THE SEMICOLON IS OPTIONAL, which is the whole of what was wrong here.
	The old scanner searched ahead for a ``;'' within 32 characters and
	gave up if it found none, so ``&gt'' stayed ``&gt'' and ``&#123''
	stayed ``&#123'' -- while ``&gt;'' and ``&#123;'' converted.  HTML has
	never required the terminator for a numeric reference, and permits its
	absence for 106 LEGACY named ones.

	The named lookup is CPython's, and depends on the table having
	upstream's exact shape (see html_entities.gs): every entity under
	``name;'', the legacy ones ALSO under the bare ``name''.  An exact hit
	wins; failing that the LONGEST PREFIX that is a key wins and the rest
	of the text is kept, which is what makes ``&notit;'' answer the
	not-sign followed by ``it;''.  A prefix of one character never
	matches.

	Numeric references get three corrections before chr():

	  * _invalid_charrefs -- the Windows-1252 fixups the standard mandates,
	    so ``&#128'' is a EURO SIGN and not U+0080;
	  * a surrogate or anything above U+10FFFF becomes U+FFFD;
	  * _invalid_codepoints -- the control and non-character ranges --
	    become the empty string."

	| out i len |
	(s @env0:includesString: '&') ifFalse: [^ s].
	out := AppendStream @env0:on: (Unicode32 @env0:new).
	i := 1.
	len := s @env0:size.
	[i @env0:<= len] @env0:whileTrue: [
		| ch |
		ch := s @env0:at: i.
		(ch == $&) ifTrue: [
			| j stop numeric hex body next replacement |
			"Scan the reference body: digits for a numeric one, otherwise up
			to 32 characters that may name an entity.  A trailing semicolon
			is consumed when present and kept in the KEY, because the table
			is keyed that way."
			j := i @env0:+ 1.
			numeric := (j @env0:<= len) and: [(s @env0:at: j) == $#].
			numeric
				ifTrue: [
					hex := (j @env0:+ 1 @env0:<= len)
						and: [((s @env0:at: j @env0:+ 1) == $x)
							or: [(s @env0:at: j @env0:+ 1) == $X]].
					stop := hex ifTrue: [j @env0:+ 2] ifFalse: [j @env0:+ 1].
					[stop @env0:<= len and: [hex
						ifTrue: [(s @env0:at: stop) @env0:isHexDigit]
						ifFalse: [(s @env0:at: stop) @env0:isDigit]]]
						@env0:whileTrue: [stop := stop @env0:+ 1]]
				ifFalse: [
					stop := j.
					[stop @env0:<= len
						and: [(stop @env0:- j) @env0:< 32
						and: [(s @env0:at: stop) @env0:isAlphaNumeric]]]
						@env0:whileTrue: [stop := stop @env0:+ 1]].
			next := stop.
			(stop @env0:<= len and: [(s @env0:at: stop) == $;])
				ifTrue: [next := stop @env0:+ 1].
			body := s @env0:copyFrom: (i @env0:+ 1) to: (next @env0:- 1).
			replacement := body @env0:isEmpty
				ifTrue: [nil]
				ifFalse: [numeric
					ifTrue: [self ___numericCharref___: body hex: hex]
					ifFalse: [self ___namedCharref___: body]].
			replacement == nil
				ifTrue: [out @env0:nextPut: ch. i := i @env0:+ 1]
				ifFalse: [out @env0:nextPutAll: replacement. i := next]
		] ifFalse: [
			out @env0:nextPut: ch.
			i := i @env0:+ 1
		].
	].
	^ out @env0:contents @env0:asString
%

category: 'Grail-Escaping'
method: html
___numericCharref___: body hex: isHex
	"The replacement for ``#NNN'' or ``#xHHH'', with any trailing
	semicolon already in ``body'' -- see unescape:.  nil when there are no
	digits at all, which leaves the ``&'' as literal text."

	| digits cp |
	digits := body @env0:copyFrom: (isHex ifTrue: [3] ifFalse: [2])
		to: body @env0:size.
	(digits @env0:notEmpty and: [(digits @env0:last) == $;])
		ifTrue: [digits := digits @env0:copyFrom: 1 to: digits @env0:size @env0:- 1].
	digits @env0:isEmpty ifTrue: [^ nil].
	cp := [PythonParser @env0:integerFrom: digits radix: (isHex ifTrue: [16] ifFalse: [10])]
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	cp == nil ifTrue: [^ nil].
	(self ___invalidCharrefs___ @env0:at: cp otherwise: nil)
		@env0:ifNotNil: [:fix | ^ fix].
	((cp @env0:>= 16rD800 and: [cp @env0:<= 16rDFFF]) or: [cp @env0:> 16r10FFFF])
		ifTrue: [^ (Character @env0:codePoint: 16rFFFD) @env0:asString].
	(self ___isInvalidCodepoint___: cp) ifTrue: [^ ''].
	^ (Character @env0:codePoint: cp) @env0:asString
%

category: 'Grail-Escaping'
method: html
___namedCharref___: body
	"CPython's named lookup: an exact hit on the table, else the LONGEST
	PREFIX that is a key, with the unmatched tail kept.  nil when nothing
	matches, which leaves the ``&'' as literal text.

	The prefix search stops at two characters, as upstream's does -- a
	one-character name is never a key."

	| table hit |
	table := (html_entities instance) @env0:at: #html5.
	hit := table @env0:at: body ifAbsent: [nil].
	hit == nil ifFalse: [^ hit].
	body @env0:size @env0:- 1 @env0:to: 2 by: -1 do: [:x |
		| prefix |
		prefix := body @env0:copyFrom: 1 to: x.
		hit := table @env0:at: prefix ifAbsent: [nil].
		hit == nil ifFalse: [
			^ hit @env0:, (body @env0:copyFrom: x @env0:+ 1 to: body @env0:size)]].
	^ nil
%

category: 'Grail-Escaping'
method: html
___invalidCharrefs___
	"The Windows-1252 fixups the HTML standard mandates for numeric
	references in 0x80..0x9F, plus U+0000 and U+000D.  Built once per
	session; CPython carries the same table as _invalid_charrefs."

	| cached table src i |
	cached := SessionTemps @env0:current
		@env0:at: #GrailHtmlInvalidCharrefs ifAbsent: [nil].
	cached == nil ifFalse: [^ cached].
	table := IdentityKeyValueDictionary @env0:new.
	src := #(0 65533 13 13 128 8364 129 129 130 8218 131 402 132 8222 133 8230 134 8224 135 8225 136 710 137 8240 138 352 139 8249 140 338 141 141 142 381 143 143 144 144 145 8216 146 8217 147 8220 148 8221 149 8226 150 8211 151 8212 152 732 153 8482 154 353 155 8250 156 339 157 157 158 382 159 376).
	i := 1.
	[i @env0:< src @env0:size] @env0:whileTrue: [
		table @env0:at: (src @env0:at: i)
			put: (Character @env0:codePoint: (src @env0:at: i @env0:+ 1)) @env0:asString.
		i := i @env0:+ 2].
	SessionTemps @env0:current @env0:at: #GrailHtmlInvalidCharrefs put: table.
	^ table
%

category: 'Grail-Escaping'
method: html
___isInvalidCodepoint___: cp
	"The control and non-character code points the HTML standard drops
	entirely -- a numeric reference to one answers the empty string.
	Expressed as RANGES rather than as CPython's literal set, which is the
	same membership in a tenth of the text."

	(cp @env0:>= 16r1 and: [cp @env0:<= 16r8]) ifTrue: [^ true].
	cp @env0:= 16rB ifTrue: [^ true].
	(cp @env0:>= 16rE and: [cp @env0:<= 16r1F]) ifTrue: [^ true].
	(cp @env0:>= 16r7F and: [cp @env0:<= 16r9F]) ifTrue: [^ true].
	(cp @env0:>= 16rFDD0 and: [cp @env0:<= 16rFDEF]) ifTrue: [^ true].
	"The last two code points of every plane."
	^ (cp @env0:bitAnd: 16rFFFE) @env0:= 16rFFFE
%

set compile_env: 0
