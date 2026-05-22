! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeAst
expectvalue /Class
doit
ExpressionAst subclass: 'AttributeAst'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AttributeAst comment:
'https://docs.python.org/3/library/ast.html#ast.Attribute

Attribute access, e.g. d.keys.

value is a node, typically a Name.
attr is a bare string giving the name of the attribute.
ctx is Load, Store or Del according to how the attribute is acted on.

Example:
>>> print(ast.dump(ast.parse(''snake.colour'', mode=''eval''), indent=4))
Expression(
    body=Attribute(
        value=Name(id=''snake'', ctx=Load()),
        attr=''colour'',
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AttributeAst(value attr ctx)
'
%

expectvalue /Class
doit
AttributeAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AttributeAst
removeallmethods AttributeAst
removeallclassmethods AttributeAst

set compile_env: 0

category: 'Grail-accessing'
method: AttributeAst
attr

	^attr
%

category: 'Grail-accessing'
method: AttributeAst
value

	^value
%

category: 'Grail-other'
method: AttributeAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'Grail-other'
method: AttributeAst
declareVariable
	"`self.X = expr` (or `cls.X = expr`) is the canonical Python
	idiom for declaring an instance attribute.  Propagate `X` up
	the parent chain via `declareInstanceVar:` so the enclosing
	ClassDefAst can collect it as a Smalltalk instVar.  Forward
	`declareVariable` on the receiver as before so the receiver's
	own name (`self` / `cls`) still surfaces as a local in the
	enclosing function scope."

	((value isKindOf: NameAst)
		and: [value id == #self or: [value id == #cls]]) ifTrue: [
		parent ifNotNil: [parent declareInstanceVar: attr asSymbol]
	].
	value declareVariable.
%

category: 'Grail-other'
method: AttributeAst
id

	^attr
%

category: 'Grail-other'
method: AttributeAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: value id;
		nextPut: $.;
		nextPutAll: attr;
		nextPut: $);
		yourself.
%

category: 'Grail-other'
method: AttributeAst
printSmalltalkOn: aStream
	"When in class method context and value is the self parameter, emit
	an AttributeError-checked instVar read so an unset attribute raises
	a Python-shaped error instead of silently flowing nil downstream.
	(Phase C-3 — paired with Phase C-2 for unbound locals.)

	Otherwise emit ``(value) attr`` so dispatch goes through the regular
	Smalltalk message-send path; if attr is missing on a non-class-method
	receiver, the env-1 DNU backstop converts the resulting nil into a
	Python error if it reaches a message send."

	self assertContextIsLoad.
	"`self.X` inside a class method gets the instVar-read fast path,
	but only when the first parameter is literally `self` —
	conventionally an instance method.  When the method's first
	param is `cls` (e.g. `def __new__(cls, name):`), the first arg
	is the class object, NOT an instance, and `cls.X` should resolve
	through the normal attribute-load path so a class-level
	attribute (like ``Symbol.symbols`` in blinker._utilities) reaches
	the class-side accessor rather than chasing an instance instVar
	that doesn't exist."
	((value isKindOf: NameAst)
		and: [(CallAst isSelfReference: value id)
			and: [CallAst selfParameterName == #self]]) ifTrue: [
		"`self.X` inside an instance method:
		  - X is an inst var       → AttributeError-checked instVar read
		                              (fast path; the check fires a Python-
		                              shaped error if the slot is still nil).
		  - X is a class method    → emit `(self X)` so it dispatches to
		                              the method (covers @property and any
		                              other parameterless method call).
		  - X is neither           → fall through to the runtime
		                              ___pyAttrLoad___: dispatch, which
		                              walks instance → class → metaclass
		                              and raises AttributeError on miss.
		                              Catches class-side attributes
		                              declared at class-body scope
		                              (e.g. ``set_class: type = set`` in
		                              blinker.Signal), which Grail stores
		                              as Smalltalk classInstVars — not
		                              reachable from an instance method's
		                              instVar lookup."
		"A name in classAttrNames is declared at class-body scope
		(``X = expr`` or ``X: type = expr``).  Grail stores it as a
		class-side instVar with a class-side accessor pair on the
		metaclass.  ``self.X`` for such a name must NOT take the
		instance-instVar fast path even when X is ALSO discovered as
		an instance instVar via a later ``self.X = …`` write —
		otherwise the read pulls the (nil) instance slot and the
		AttributeError guard fires, masking the class-level default.
		Route through ___pyAttrLoad___ which checks instance __dict__
		first, then the class-side accessor."
		(CallAst classAttrNames notNil
			and: [CallAst classAttrNames includes: attr asSymbol])
			ifTrue: [
				aStream
					nextPutAll: '(self @env1:___pyAttrLoad___: #''';
					nextPutAll: attr;
					nextPutAll: ''')'.
				^self
		].
		(CallAst classInstVarNames notNil
			and: [CallAst classInstVarNames includes: attr asSymbol]) ifTrue: [
			aStream
				nextPutAll: '(AttributeError @env0:___checkAttr: ';
				nextPutAll: attr;
				nextPutAll: ' ofObject: self named: #';
				nextPutAll: attr;
				nextPutAll: ')'.
			^self
		].
		(CallAst classFunctionNames notNil
			and: [CallAst classFunctionNames includes: attr asSymbol]) ifTrue: [
			aStream nextPutAll: '(self '; nextPutAll: attr; nextPutAll: ')'.
			^self
		].
		"Unknown attr on self — runtime dispatch."
		aStream
			nextPutAll: '(self @env1:___pyAttrLoad___: #''';
			nextPutAll: attr;
			nextPutAll: ''')'.
		^self
	].
	"Dispatch attribute load through the ___pyAttrLoad___: runtime
	helper.  It returns the value if `attr` is an instVar/property
	(class has an `attr:` setter), or a BoundMethod if `attr` names a
	regular method.  This is what makes `f = obj.method; f(...)` work
	in Python idioms without prematurely calling the 0-arg method."

	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: attr.
	aStream nextPutAll: ''''.
%

category: 'Grail-other'
method: AttributeAst
setSuperInfo: aScope

	aScope superInfo at: #'type' put: aScope outer astNode
%
