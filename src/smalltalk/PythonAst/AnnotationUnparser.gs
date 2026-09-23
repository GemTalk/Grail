! ===============================================================================
! AnnotationUnparser -- AbstractNode methods that render an expression as source.
!
! A port of CPython's ast._Unparser for the expression subset annotations use:
! what Format.STRING answers and what ``from __future__ import annotations''
! stores.  In its OWN FILE, loaded after every PythonAst node class, because the
! dispatch names NameAst, AddAst, EqAst and the rest -- and AbstractNode.gs
! compiles before any of them exists, where each would be an undefined symbol.
! ===============================================================================

set compile_env: 0

category: 'Grail-annotations'
method: AbstractNode
___annotationSourceString___
	"The annotation as SOURCE TEXT -- what Format.STRING answers, and what
	``from __future__ import annotations'' stores.

	CPython's own text for these comes from ``ast.unparse'': the STRING format
	re-runs the annotate function against fake globals and unparses the
	expression the stringifiers recorded, and PEP 563 unparses the parse tree.
	So this is a port of ast._Unparser -- its PRECEDENCE rules, which decide
	every parenthesis (``(a + b) * c'', ``a[b, c]'' against a bare ``(a, b)''),
	and its rendering of each node -- started at TEST, the precedence
	ast.unparse starts at.

	It replaces a handful of per-node renderers that covered Name / Attribute /
	Subscript / Tuple / BinOp and answered ``<annotation>'' for everything else:
	a comparison, a unary minus, a call, a slice, a list or dict display all
	lost their text entirely, and a nested string literal lost its quotes.
	Measured against CPython 3.14.6 over test_annotationlib's TestStringFormat.

	A string constant at the ROOT stays verbatim -- ConstantAst overrides this,
	because ``x: 'Foo''' is a forward reference whose content IS the text."

	^ self ___unparse___: 4
%

category: 'Grail-annotations'
method: AbstractNode
___unparse___: prec
	| s |
	s := WriteStream on: String new.
	self ___unparseOn___: s prec: prec.
	^ s contents
%

category: 'Grail-annotations'
method: AbstractNode
___up___: aNode on: aStream prec: prec
	"Unparse a CHILD, which may be nil (an absent slice bound)."

	aNode isNil ifTrue: [^ self].
	(aNode isKindOf: AbstractNode)
		ifTrue: [aNode ___unparseOn___: aStream prec: prec]
		ifFalse: [aStream nextPutAll: '<annotation>']
%

category: 'Grail-annotations'
method: AbstractNode
___upItems___: nodes on: aStream prec: prec
	"CPython's interleave(', ') over a sequence of child nodes."

	nodes isNil ifTrue: [^ self].
	nodes doWithIndex: [:n :i |
		i > 1 ifTrue: [aStream nextPutAll: ', '].
		self ___up___: n on: aStream prec: prec]
%

category: 'Grail-annotations'
method: AbstractNode
___upIv___: aSymbol
	^ self ___nodeInstVar___: self named: aSymbol
%

category: 'Grail-annotations'
method: AbstractNode
___unparseOn___: aStream prec: prec
	"ast._Unparser's visit_* for the expression subset annotations use.

	Precedence values are CPython's _Precedence, numbered in its order:
	NAMED_EXPR 1, TUPLE 2, YIELD 3, TEST 4, OR 5, AND 6, NOT 7, CMP 8,
	EXPR = BOR 9, BXOR 10, BAND 11, SHIFT 12, ARITH 13, TERM 14, FACTOR 15,
	POWER 16, AWAIT 17, ATOM 18.  A node is parenthesised exactly when the
	precedence its context demands exceeds its own (require_parens)."

	| cls |
	cls := self class name asString.
	(self isKindOf: NameAst) ifTrue: [
		^ aStream nextPutAll: self writtenId asString].
	(self isKindOf: ConstantAst) ifTrue: [
		^ aStream nextPutAll: self ___constantRepr___].
	(self isKindOf: AttributeAst) ifTrue: [ | v |
		v := self ___upIv___: #value.
		self ___up___: v on: aStream prec: 18.
		"``1 .real'': a bare int would lex ``1.'' as a float."
		((v isKindOf: ConstantAst) and: [(self ___nodeInstVar___: v named: #value) isKindOf: Integer])
			ifTrue: [aStream space].
		^ aStream nextPut: $.; nextPutAll: (self ___upIv___: #attr) asString].
	(self isKindOf: SubscriptAst) ifTrue: [ | sl elts |
		self ___up___: (self ___upIv___: #value) on: aStream prec: 18.
		aStream nextPut: $[.
		sl := self ___upIv___: #slice.
		((sl isKindOf: TupleAst)
			and: [(elts := self ___nodeInstVar___: sl named: #elts) notNil and: [elts notEmpty]])
			ifTrue: [self ___upItems___: elts on: aStream prec: 4]
			ifFalse: [self ___up___: sl on: aStream prec: 4].
		^ aStream nextPut: $]].
	(self isKindOf: SliceAst) ifTrue: [ | st |
		self ___up___: (self ___upIv___: #lower) on: aStream prec: 4.
		aStream nextPut: $:.
		self ___up___: (self ___upIv___: #upper) on: aStream prec: 4.
		(st := self ___upIv___: #step) notNil ifTrue: [
			aStream nextPut: $:.
			self ___up___: st on: aStream prec: 4].
		^ self].
	(self isKindOf: TupleAst) ifTrue: [ | elts paren |
		elts := (self ___upIv___: #elts) ifNil: [#()].
		paren := elts isEmpty or: [prec > 2].
		paren ifTrue: [aStream nextPut: $(].
		self ___upItems___: elts on: aStream prec: 4.
		elts size = 1 ifTrue: [aStream nextPut: $,].
		paren ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: ListAst) ifTrue: [
		aStream nextPut: $[.
		self ___upItems___: (self ___upIv___: #elts) on: aStream prec: 4.
		^ aStream nextPut: $]].
	(self isKindOf: SetAst) ifTrue: [ | elts |
		elts := (self ___upIv___: #elts) ifNil: [#()].
		elts isEmpty ifTrue: [^ aStream nextPutAll: '{*()}'].
		aStream nextPut: ${.
		self ___upItems___: elts on: aStream prec: 4.
		^ aStream nextPut: $}].
	(self isKindOf: DictAst) ifTrue: [ | ks vs |
		ks := (self ___upIv___: #keys) ifNil: [#()].
		vs := (self ___upIv___: #values) ifNil: [#()].
		aStream nextPut: ${.
		1 to: ks size do: [:i |
			i > 1 ifTrue: [aStream nextPutAll: ', '].
			(ks at: i) isNil
				ifTrue: [aStream nextPutAll: '**'.
					self ___up___: (vs at: i) on: aStream prec: 9]
				ifFalse: [
					self ___up___: (ks at: i) on: aStream prec: 4.
					aStream nextPutAll: ': '.
					self ___up___: (vs at: i) on: aStream prec: 4]].
		^ aStream nextPut: $}].
	(self isKindOf: BinOpAst) ifTrue: [ | spec glyph p lp rp |
		spec := self ___binOpSpec___: (self ___upIv___: #op).
		spec isNil ifTrue: [^ aStream nextPutAll: '<annotation>'].
		glyph := spec at: 1.
		p := spec at: 2.
		"POWER is right-associative, so it is the RIGHT operand that keeps the
		 operator's own precedence."
		p = 16 ifTrue: [lp := p + 1. rp := p] ifFalse: [lp := p. rp := p + 1].
		prec > p ifTrue: [aStream nextPut: $(].
		self ___up___: (self ___upIv___: #left) on: aStream prec: lp.
		aStream space; nextPutAll: glyph; space.
		self ___up___: (self ___upIv___: #right) on: aStream prec: rp.
		prec > p ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: UnaryOpAst) ifTrue: [ | glyph p |
		(self isKindOf: NotAst) ifTrue: [glyph := 'not '. p := 7].
		(self isKindOf: InvertAst) ifTrue: [glyph := '~'. p := 15].
		(self isKindOf: UAddAst) ifTrue: [glyph := '+'. p := 15].
		(self isKindOf: USubAst) ifTrue: [glyph := '-'. p := 15].
		glyph isNil ifTrue: [^ aStream nextPutAll: '<annotation>'].
		prec > p ifTrue: [aStream nextPut: $(].
		aStream nextPutAll: glyph.
		self ___up___: (self ___upIv___: #operand) on: aStream prec: p.
		prec > p ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: BoolOpAst) ifTrue: [ | word p q |
		(self isKindOf: AndAst) ifTrue: [word := ' and '. p := 6] ifFalse: [word := ' or '. p := 5].
		prec > p ifTrue: [aStream nextPut: $(].
		q := p.
		(self ___upIv___: #values) doWithIndex: [:v :i |
			i > 1 ifTrue: [aStream nextPutAll: word].
			"ast._Unparser raises the precedence for EACH operand in turn."
			q := q + 1.
			self ___up___: v on: aStream prec: q].
		prec > p ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: CompareAst) ifTrue: [ | ops comps |
		ops := self ___upIv___: #cmpopList.
		comps := self ___upIv___: #comparatorList.
		prec > 8 ifTrue: [aStream nextPut: $(].
		self ___up___: (self ___upIv___: #left) on: aStream prec: 9.
		1 to: ops size do: [:i |
			aStream space; nextPutAll: (self ___cmpOpGlyph___: (ops at: i)); space.
			self ___up___: (comps at: i) on: aStream prec: 9].
		prec > 8 ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: CallAst) ifTrue: [ | first |
		self ___up___: (self ___upIv___: #function) on: aStream prec: 18.
		aStream nextPut: $(.
		first := true.
		((self ___upIv___: #arguments) ifNil: [#()]) do: [:a |
			first ifFalse: [aStream nextPutAll: ', '].
			first := false.
			self ___up___: a on: aStream prec: 4].
		((self ___upIv___: #keywords) ifNil: [#()]) do: [:k | | name |
			first ifFalse: [aStream nextPutAll: ', '].
			first := false.
			name := self ___nodeInstVar___: k named: #arg.
			name isNil
				ifTrue: [aStream nextPutAll: '**']
				ifFalse: [aStream nextPutAll: name asString; nextPut: $=].
			self ___up___: (self ___nodeInstVar___: k named: #value) on: aStream prec: 4].
		^ aStream nextPut: $)].
	(self isKindOf: StarredAst) ifTrue: [
		aStream nextPut: $*.
		^ self ___up___: (self ___upIv___: #value) on: aStream prec: 9].
	(self isKindOf: IfExpAst) ifTrue: [
		prec > 4 ifTrue: [aStream nextPut: $(].
		self ___up___: (self ___upIv___: #body) on: aStream prec: 5.
		aStream nextPutAll: ' if '.
		self ___up___: (self ___upIv___: #test) on: aStream prec: 5.
		aStream nextPutAll: ' else '.
		self ___up___: (self ___upIv___: #orelse) on: aStream prec: 4.
		prec > 4 ifTrue: [aStream nextPut: $)].
		^ self].
	(self isKindOf: NamedExprAst) ifTrue: [
		prec > 1 ifTrue: [aStream nextPut: $(].
		self ___up___: (self ___upIv___: #target) on: aStream prec: 18.
		aStream nextPutAll: ' := '.
		self ___up___: (self ___upIv___: #value) on: aStream prec: 18.
		prec > 1 ifTrue: [aStream nextPut: $)].
		^ self].
	"Outside the subset (f-strings, lambdas, comprehensions): the placeholder the
	 annotation machinery has always answered, rather than guessed text."
	^ aStream nextPutAll: '<annotation>'
%

category: 'Grail-annotations'
method: AbstractNode
___binOpSpec___: anOp
	"{ glyph. precedence } for a binary operator node, or nil."

	(anOp isKindOf: AddAst) ifTrue: [^ #('+' 13)].
	(anOp isKindOf: SubAst) ifTrue: [^ #('-' 13)].
	(anOp isKindOf: MultAst) ifTrue: [^ #('*' 14)].
	(anOp isKindOf: MatMultAst) ifTrue: [^ #('@' 14)].
	(anOp isKindOf: DivAst) ifTrue: [^ #('/' 14)].
	(anOp isKindOf: ModAst) ifTrue: [^ #('%' 14)].
	(anOp isKindOf: FloorDivAst) ifTrue: [^ #('//' 14)].
	(anOp isKindOf: LShiftAst) ifTrue: [^ #('<<' 12)].
	(anOp isKindOf: RShiftAst) ifTrue: [^ #('>>' 12)].
	(anOp isKindOf: BitOrAst) ifTrue: [^ #('|' 9)].
	(anOp isKindOf: BitXorAst) ifTrue: [^ #('^' 10)].
	(anOp isKindOf: BitAndAst) ifTrue: [^ #('&' 11)].
	(anOp isKindOf: PowAst) ifTrue: [^ #('**' 16)].
	^ nil
%

category: 'Grail-annotations'
method: AbstractNode
___cmpOpGlyph___: anOp
	(anOp isKindOf: EqAst) ifTrue: [^ '=='].
	(anOp isKindOf: NotEqAst) ifTrue: [^ '!='].
	(anOp isKindOf: LtEAst) ifTrue: [^ '<='].
	(anOp isKindOf: LtAst) ifTrue: [^ '<'].
	(anOp isKindOf: GtEAst) ifTrue: [^ '>='].
	(anOp isKindOf: GtAst) ifTrue: [^ '>'].
	(anOp isKindOf: IsNotAst) ifTrue: [^ 'is not'].
	(anOp isKindOf: IsAst) ifTrue: [^ 'is'].
	(anOp isKindOf: NotInAst) ifTrue: [^ 'not in'].
	(anOp isKindOf: InAst) ifTrue: [^ 'in'].
	^ '?'
%
