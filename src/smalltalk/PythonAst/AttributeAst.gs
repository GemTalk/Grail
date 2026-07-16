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
	"The fast path applies only when ``self'' is this method's actual
	receiver.  Inside a NESTED def whose own parameter is named ``self''
	(``def outer(self): def __str__(self): return self.name ...''), that
	``self'' is the nested def's local -- transported to ``_self'' -- not
	the receiver, so it must take the general path below (LEGB-self: the
	test_enum functional-API __str__/__format__ override bug)."
	((value isKindOf: NameAst)
		and: [(CallAst isSelfReference: value id)
			and: [CallAst selfParameterName == #self
				and: [(value ___boundInNestedFunction___: value id) not]]]) ifTrue: [
		"``self.<slot>'' where <slot> is one of this class's own __slots__
		(Python __slots__ → GemStone named instVar): read the mangled
		instVar directly by bare name — this method is compiled ON the
		slotted class, so the Smalltalk compiler resolves ``___slot_x___''
		to the instVar (no reflection).  Mangling keeps it distinct from a
		Python parameter / local of the same name (``def __init__(self, x):
		self.x = x'').  A set slot returns immediately; an unset slot (nil)
		falls through to ___pyAttrLoad___ so __getattr__ / AttributeError
		still apply."
		((CallAst classSlotNames notNil)
			and: [CallAst classSlotNames includes: attr asSymbol]) ifTrue: [
			aStream
				nextPutAll: '(___slot_';
				nextPutAll: attr;
				nextPutAll: '___ ifNil: [self @env1:___pyAttrLoad___: #''';
				nextPutAll: attr;
				nextPutAll: '''])'.
			^self
		].
		"Phase B: ``self.attr'' inside an instance method is a Python
		attribute load.  The new model collapses all the old
		discriminators (classAttrNames / classInstVarNames /
		classFunctionNames) into a uniform two-step lookup that mirrors
		CPython's MRO walk:
		  (1) Probe the instance's dynamic-instVar storage — this is
		      the canonical home for any value the instance was bound
		      to (whether via ``self.attr = ...'', ``setattr(obj, ...)'',
		      or a class-level default migrated at class-init time).
		  (2) On absent (nil per the nil-as-absent convention), fall
		      through to ``self @env1:___pyAttrLoad___:'' which walks
		      the class method dict, wraps callables as BoundMethods,
		      handles class-level dunders, and raises AttributeError
		      on miss."
		aStream
			nextPutAll: '(self @env0:dynamicInstVarAt: #''';
			nextPutAll: attr;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: attr;
			nextPutAll: '''])'.
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

category: 'Grail-annotations'
method: AttributeAst
___annotationSourceString___
	^ (value ___annotationSourceString___) , '.' , attr asString
%
