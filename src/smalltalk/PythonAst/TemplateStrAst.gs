! ------------------- Superclass check
run
CallAst ifNil: [self error: 'CallAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for TemplateStrAst
expectvalue /Class
doit
CallAst subclass: 'TemplateStrAst'
  instVarNames: #( templateParts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TemplateStrAst comment:
'https://docs.python.org/3/library/ast.html#ast.TemplateStr

A PEP 750 template string literal, t''...''.

Grail compiles it as the CALL it inherits from CallAst:
string.templatelib._from_literal(...) with each literal run as a str and each
field as a (value, expression, conversion, format_spec) tuple -- Template and
Interpolation are Python classes in string/templatelib.py.

templateParts keeps the literal''s shape unevaluated, for the source text the
STRING annotation format answers: an Array whose elements are either a String
(a literal run) or { expressionText. conversionString-or-nil. specSource-or-nil }.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CallAst(function arguments keywords)
          TemplateStrAst(templateParts)
'
%

expectvalue /Class
doit
TemplateStrAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TemplateStrAst
removeallmethods TemplateStrAst
removeallclassmethods TemplateStrAst
set compile_env: 0
! ------------------- Instance methods for TemplateStrAst

category: 'Grail-accessing'
method: TemplateStrAst
templateParts

	^ templateParts
%

category: 'Grail-accessing'
method: TemplateStrAst
templateParts: anArray

	templateParts := anArray
%

category: 'Grail-AST export'
method: TemplateStrAst
___pythonAstClassName___
	"Exported as the call it compiles to: Grail's ast module has no TemplateStr."

	^ 'Call'
%

category: 'Grail-annotations'
method: TemplateStrAst
___unparseOn___: aStream prec: prec
	"The t-string literal CPython's STRING format answers for it.

	CPython gets that text by evaluating the literal against stringifiers and
	unparsing the Template that comes back (annotationlib._template_to_ast), so
	it is the text of the TEMPLATE, not of the source: an empty literal run
	vanishes, each field is its recorded expression text (leading whitespace
	kept -- ``t'{ 0}''' stays that way, gh-138558), and a format spec is its
	EVALUATED string, so a nested ``{1}'' comes back as ``1''.  The quoting is
	ast._Unparser._ftstring_helper's, ported below."

	| pieces |
	pieces := OrderedCollection new.
	(templateParts ifNil: [#()]) do: [:p |
		(p isKindOf: CharacterCollection)
			ifTrue: [p isEmpty ifFalse: [
				pieces add: { self ___doubledBraces___: p asString. true }]]
			ifFalse: [pieces add: { self ___interpolationSource___: p. false }]].
	aStream nextPut: $t.
	self ___writeFtstring___: pieces on: aStream
%

category: 'Grail-annotations'
method: TemplateStrAst
___doubledBraces___: aString
	| out |
	out := WriteStream on: String new.
	aString do: [:c |
		out nextPut: c.
		(c == ${ or: [c == $}]) ifTrue: [out nextPut: c]].
	^ out contents
%

category: 'Grail-annotations'
method: TemplateStrAst
___interpolationSource___: aPart
	"ast._Unparser._write_interpolation with use_str_attr: the recorded text,
	then !conversion, then :spec escaped as _write_ftstring_inner escapes one."

	| out expr conv spec |
	out := WriteStream on: String new.
	expr := aPart at: 1.
	conv := aPart at: 2.
	spec := aPart at: 3.
	out nextPut: ${.
	(expr notEmpty and: [expr first == ${]) ifTrue: [out space].
	out nextPutAll: expr.
	conv isNil ifFalse: [out nextPut: $!; nextPutAll: conv].
	spec isNil ifFalse: [ | evaluated |
		evaluated := self ___evaluatedSpecSource___: spec.
		evaluated isEmpty ifFalse: [
			out nextPut: $:.
			(self ___doubledBraces___: evaluated) do: [:c |
				c == $\ ifTrue: [out nextPutAll: '\\'] ifFalse: [
				c == $' ifTrue: [out nextPutAll: '\'''] ifFalse: [
				c == $" ifTrue: [out nextPutAll: '\"'] ifFalse: [
				c == Character lf ifTrue: [out nextPutAll: '\n'] ifFalse: [
				out nextPut: c]]]]]]].
	out nextPut: $}.
	^ out contents
%

category: 'Grail-annotations'
method: TemplateStrAst
___evaluatedSpecSource___: aSpec
	"A spec as the stringifiers would have evaluated it: each nested field
	``{expr}'' becomes the expression's own text."

	| out pos len ch depth start |
	out := WriteStream on: String new.
	pos := 1.
	len := aSpec size.
	[pos <= len] whileTrue: [
		ch := aSpec at: pos.
		ch == ${
			ifTrue: [
				start := pos + 1.
				depth := 1.
				pos := pos + 1.
				[pos <= len and: [depth > 0]] whileTrue: [
					(aSpec at: pos) == ${ ifTrue: [depth := depth + 1].
					(aSpec at: pos) == $} ifTrue: [depth := depth - 1].
					depth > 0 ifTrue: [pos := pos + 1]].
				out nextPutAll: (aSpec copyFrom: start to: pos - 1) trimSeparators.
				pos := pos + 1]
			ifFalse: [
				out nextPut: ch.
				pos := pos + 1]].
	^ out contents
%

category: 'Grail-annotations'
method: TemplateStrAst
___writeFtstring___: pieces on: aStream
	"ast._Unparser._ftstring_helper: pick the first quote every literal run and
	every field can live inside, and fall back to triple single quotes with
	repr-escaped runs when none fits.  pieces holds { text. isConstant }."

	| multi quoteTypes fallback texts quote |
	multi := #('"""' '''''''').
	quoteTypes := #('''' '"' '"""' '''''''') asOrderedCollection.
	fallback := false.
	texts := OrderedCollection new.
	pieces do: [:piece | | text |
		fallback ifFalse: [
			text := piece at: 1.
			(piece at: 2)
				ifTrue: [ | result newTypes |
					result := self ___strLiteral___: text quoteTypes: quoteTypes.
					newTypes := result at: 2.
					(newTypes detect: [:q | quoteTypes includes: q] ifNone: [nil]) isNil
						ifTrue: [fallback := true]
						ifFalse: [
							quoteTypes := newTypes.
							texts add: (result at: 1)]]
				ifFalse: [ | newTypes |
					(text includes: Character lf) ifTrue: [
						quoteTypes := quoteTypes select: [:q | multi includes: q]].
					newTypes := quoteTypes reject: [:q | text includesString: q].
					newTypes isEmpty ifFalse: [quoteTypes := newTypes].
					texts add: text]]].
	fallback ifTrue: [
		quoteTypes := OrderedCollection with: ''''''''.
		texts := OrderedCollection new.
		pieces do: [:piece |
			(piece at: 2)
				ifTrue: [ | r |
					"repr of the text behind a double-quote character is always
					 single-quoted; drop the two-character prefix that adds."
					r := self ___pyRepr___: '"' , (piece at: 1).
					texts add: (r copyFrom: 3 to: r size - 1)]
				ifFalse: [texts add: (piece at: 1)]]].
	quote := quoteTypes first.
	aStream nextPutAll: quote.
	texts do: [:t | aStream nextPutAll: t].
	aStream nextPutAll: quote
%

category: 'Grail-annotations'
method: TemplateStrAst
___strLiteral___: aString quoteTypes: quoteTypes
	"ast._Unparser._str_literal_helper with escape_special_whitespace: answers
	{ escapedText. possibleQuoteTypes }."

	| out escaped possible quoted |
	out := WriteStream on: String new.
	aString do: [:c | out nextPutAll: (self ___escapeChar___: c)].
	escaped := out contents.
	possible := quoteTypes reject: [:q | escaped includesString: q].
	possible isEmpty ifTrue: [
		quoted := self ___pyRepr___: aString.
		^ { quoted copyFrom: 2 to: quoted size - 1.
			OrderedCollection with: (quoteTypes
				detect: [:q | q includes: quoted first]
				ifNone: [quoted first asString]) }].
	escaped isEmpty ifFalse: [
		"Stable: quotes whose first char would end the text go last."
		possible := (possible reject: [:q | q first == escaped last]) ,
			(possible select: [:q | q first == escaped last]).
		possible first first == escaped last ifTrue: [
			escaped := (escaped copyFrom: 1 to: escaped size - 1) , '\' , escaped last asString]].
	^ { escaped. possible }
%

category: 'Grail-annotations'
method: TemplateStrAst
___escapeChar___: aChar
	"A backslash or a non-printable character as unicode_escape spells it."

	| cp hex |
	aChar == $\ ifTrue: [^ '\\'].
	aChar == Character tab ifTrue: [^ '\t'].
	aChar == Character lf ifTrue: [^ '\n'].
	aChar == Character cr ifTrue: [^ '\r'].
	cp := aChar codePoint.
	(cp < 32 or: [cp >= 127 and: [cp < 160]]) ifFalse: [^ aChar asString].
	hex := '0123456789abcdef'.
	^ '\x' , (hex at: cp // 16 + 1) asString , (hex at: cp \\ 16 + 1) asString
%

category: 'Grail-annotations'
method: TemplateStrAst
___pyRepr___: aString
	^ [((Python at: #builtins) @env1:instance @env1:repr: aString) asString]
		on: AbstractException do: [:ex | ex return: aString printString]
%
