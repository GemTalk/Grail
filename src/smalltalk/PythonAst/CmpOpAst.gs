! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for CmpOpAst
expectvalue /Class
doit
AbstractNode subclass: 'CmpOpAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CmpOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.cmpop

Comparison operator base class.

This is an abstract base class for all comparison operator tokens (Eq, NotEq, Lt, LtE, Gt, GtE, Is, IsNot, In, NotIn).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
'
%

expectvalue /Class
doit
CmpOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from CmpOpAst
removeallmethods CmpOpAst
removeallclassmethods CmpOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: CmpOpAst
isAbstract

	^self == CmpOpAst
%

category: 'Grail-other'
method: CmpOpAst
printSmalltalkOn: aStream left: left rightList: right rhsTemp: rhsName lhsTemp: lhsName
	"For the rich comparison operators, route through object>>___cmpXx___: (a
	per-op helper doing a DIRECT dunder send + NotImplemented check) so an
	explicit ``return NotImplemented'' from a forward comparison dunder triggers
	the reflected op / identity instead of leaking the NotImplemented singleton
	into the enclosing boolean context.  ``is''/``is not'' and any other
	operator keep the bare send."

	| opStream sel helper |
	aStream nextPut: $(.

	left ifNil: [
		aStream nextPutAll: rhsName.
	] ifNotNil: [
		 left printSmalltalkWithParenthesisOn: aStream.
	].

	opStream := WriteStream on: String new.
	self printSmalltalkOn: opStream.
	sel := opStream contents trimSeparators.
	helper := self ___cmpHelperFor___: sel.
	helper isNil
		ifTrue: [aStream nextPutAll: opStream contents]
		ifFalse: [aStream nextPutAll: ' '; nextPutAll: helper; nextPutAll: ' '].

	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPutAll: '(' , rhsName , ' := '.
		right first printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].

	aStream nextPut: $).
%

category: 'Grail-other'
method: CmpOpAst
___cmpHelperFor___: sel
	"Map a rich-comparison dunder selector to its NotImplemented-aware helper
	on object; nil for is/is-not (and anything else), which keep the bare send."

	| m |
	m := Dictionary new.
	m at: '__eq__:' put: '___cmpEq___:';
		at: '__ne__:' put: '___cmpNe___:';
		at: '__lt__:' put: '___cmpLt___:';
		at: '__le__:' put: '___cmpLe___:';
		at: '__gt__:' put: '___cmpGt___:';
		at: '__ge__:' put: '___cmpGe___:'.
	^ m at: sel otherwise: nil
%
