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
___mangledAttr___
	"The attribute name AS COMPILED: private-name mangled when this node
	sits inside a class body (see AbstractNode>>___manglePrivate___:).
	Every codegen site that emits an attribute NAME must go through this
	rather than reading ``attr'' raw, or a store and its matching load
	would disagree."

	^ self ___manglePrivate___: attr
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

category: 'Grail-traceback'
method: AttributeAst
printSmalltalkOn: aStream
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream
%

category: 'Grail-other'
method: AttributeAst
___emitSmalltalkOn___: aStream
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
		"``self.<slot>'' for a DECLARED __slots__ name or an INFERRED one
		(GRAIL_INFERRED_SLOTS): an accessor SEND, not an instVar read --
		``(self ___pyattr_x___)''.  The accessor, compiled on the class at build
		time (object class >> ___grailInstallInferredSlots___:declared:...),
		reads the slot's POSITION in the instance's indexed part
		(docs/Instance_Attribute_Indexed_Slots.md), does the nil check and the
		___pyAttrLoad___ fallback; being a send, a subclass @property /
		__getattribute__ overrides it by method lookup.  A declared slot used to
		be a named instVar ``___slot_x___'' read by bare name here; the class
		then had a shape an edit could not grow."
		(CallAst ___inferredSlotAccessorFor___: value attr: self ___mangledAttr___) ifNotNil: [:acc |
			aStream nextPutAll: '(self '; nextPutAll: acc; nextPut: $).
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
			nextPutAll: self ___mangledAttr___;
			nextPutAll: ''' ifAbsent: [self @env1:___pyAttrLoad___: #''';
			nextPutAll: self ___mangledAttr___;
			nextPutAll: '''])'.
		^self
	].
	"Dispatch attribute load through the ___pyAttrLoad___: runtime
	helper.  It returns the value if `attr` is an instVar/property
	(class has an `attr:` setter), or a BoundMethod if `attr` names a
	regular method.  This is what makes `f = obj.method; f(...)` work
	in Python idioms without prematurely calling the 0-arg method."

	"GRAIL_ATTR_ACCESSORS (stage 3): the READ has its own spelling -- the direct
	env-1 unary send ``((recv) ___pyattr_x___)''.  The accessor is compiled on
	the receiver's class at build time (inferred names, methods, class-body
	attributes: object class >> ___grailInstallInferredSlots___: /
	___grailInstallAttrReadAccessors___:); a receiver without one misses into
	its doesNotUnderstand hook, which answers through ___pyAttrLoad___.
	___attrAccessorSelector___ holds the exclusions, shared with the IR."
	(self ___attrAccessorSelector___) ifNotNil: [:acc |
		aStream nextPut: $(.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $ ; nextPutAll: acc; nextPut: $).
		^ self].
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:___pyAttrLoad___: #'''.
	aStream nextPutAll: self ___mangledAttr___.
	aStream nextPutAll: ''''.
%

category: 'Grail-Attr Accessors'
method: AttributeAst
___attrAccessorSelector___
	"The read-accessor selector (a String, ``___pyattr_x___'') when this LOAD
	compiles to the direct unary send under GRAIL_ATTR_ACCESSORS -- else nil,
	and the load keeps ``(recv) ___pyAttrLoad___: #x''.  Called for the GENERAL
	receiver only (the self-receiver branch of the emitters has its own slot /
	inferred-accessor / dynamic-probe shapes).  Kept with the loader:
	  a. a dunder attribute (``x.__class__'', ``f.__name__''): the loader's
	     dunder branches -- metaclass consults, kernel synthesis -- ARE its
	     semantics;
	  b. a ``___'' name (Grail protocol read from Python);
	  c. a statically known MODULE receiver (its resolved path already);
	  d. a statically CLASS-LIKE receiver (#967's exclusions 5 and 9: the
	     ``cls'' parameter, a nested / module-level / enclosing-def class name,
	     ``type(x)'', ``x.__class__''): class attributes live in the class-side
	     'Grail-Class Attrs' pair and the loader's Behavior branches; an accessor
	     send there could only DNU back into the loader;
	  e. a ``super()'' receiver: Super>>___pyAttrLoad___: walks the MRO."

	| attrName recv |
	importlib ___attrAccessorsEnabled___ ifFalse: [^ nil].
	attrName := self ___mangledAttr___ asString.
	(attrName size >= 3 and: [(attrName copyFrom: 1 to: 3) = '___']) ifTrue: [^ nil].
	(attrName size > 4
		and: [(attrName copyFrom: 1 to: 2) = '__'
		and: [(attrName copyFrom: attrName size - 1 to: attrName size) = '__']])
			ifTrue: [^ nil].
	recv := value.
	(recv isKindOf: NameAst) ifTrue: [
		| id |
		id := recv id.
		(CallAst resolveModuleClassForName: id) ifNotNil: [^ nil].
		((CallAst isSelfReference: id)
			and: [CallAst selfParameterName == #cls]) ifTrue: [^ nil].
		(CallAst classNestedClassNames notNil
			and: [CallAst classNestedClassNames includes: id asSymbol]) ifTrue: [^ nil].
		(CallAst moduleClassNames notNil
			and: [CallAst moduleClassNames includes: id asSymbol]) ifTrue: [^ nil].
		(self ___nameIsLocalClassName___: id asSymbol) ifTrue: [^ nil]].
	((recv isKindOf: AttributeAst) and: [recv attr asString = '__class__']) ifTrue: [^ nil].
	((recv isKindOf: CallAst)
		and: [(recv function isKindOf: NameAst)
		and: [#(#'type' #'super') includes: recv function id asSymbol]]) ifTrue: [^ nil].
	^ '___pyattr_' , attrName , '___'
%

category: 'Grail-Attr Accessors'
method: AttributeAst
___nameIsLocalClassName___: id
	"Is id bound by a ``class'' statement in an enclosing def or lambda?  The
	walk of CallAst>>___receiverIsLocalClassName___: (exclusion 9), from this
	node's parent chain."

	| node stmts |
	node := self parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst]) ifTrue: [
			stmts := node body.
			(stmts isKindOf: Collection) ifFalse: [
				stmts := [stmts body] on: MessageNotUnderstood do: [:ex | ex return: #()]].
			(stmts isKindOf: Collection) ifTrue: [
				stmts do: [:stmt |
					((stmt isKindOf: ClassDefAst) and: [stmt name asSymbol == id])
						ifTrue: [^ true]]]].
		node := node parent].
	^ false
%

category: 'Grail-other'
method: AttributeAst
setSuperInfo: aScope

	aScope superInfo at: #'type' put: aScope outer astNode
%

method: AttributeAst
value: newValue
	value := newValue
%
method: AttributeAst
attr: newValue
	attr := newValue
%
method: AttributeAst
ctx
	^ctx
%
method: AttributeAst
ctx: newValue
	ctx := newValue
%

category: 'Grail-IR Codegen'
method: AttributeAst
___irEligibleValueLocals___: localNames
	"A load of obj.attr; the general ___pyAttrLoad___ path applies since an
	eligible module def has no self/class context or __slots__ fast path."

	(ctx isKindOf: LoadAst) ifFalse: [^ false].
	^ value ___irEligibleValueLocals___: localNames
%

category: 'Grail-IR Codegen'
method: AttributeAst
___emitIRValueOn___: aBuilder
	"(value) @env1:___pyAttrLoad___: #attr -- the general attribute-load emit;
	and, for ``self.attr'' inside a method (cut 36), the text's two-step
	self-receiver shape:
	  (self @env0:dynamicInstVarAt: #attr ifAbsent: [self @env1:___pyAttrLoad___: #attr])
	-- the instance's dynamic-instVar storage first, the class walk on absent.
	A slot -- declared in __slots__, or inferred under GRAIL_INFERRED_SLOTS --
	is the accessor send the text emits, ``self ___pyattr_x___''; cut 51's
	named-instVar leaf for a declared slot went with the named instVars
	(docs/Instance_Attribute_Indexed_Slots.md)."

	| recv |
	((value isKindOf: NameAst) and: [value ___irIsSelfReceiver___]) ifTrue: [
		aBuilder atNode: self.
		(self ___irSelfInferredSlotAccessor___) ifNotNil: [:acc |
			^ aBuilder send: acc to: aBuilder selfNode with: #() env: 1].
		^ aBuilder
			send: #dynamicInstVarAt:ifAbsent:
			to: aBuilder selfNode
			with: { aBuilder obj: self ___mangledAttr___ asSymbol.
				aBuilder inBlockDo: [aBuilder add: (aBuilder
					send: #'___pyAttrLoad___:' to: aBuilder selfNode
					with: { aBuilder obj: self ___mangledAttr___ asSymbol } env: 1)] }
			env: 0].
	recv := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	"GRAIL_ATTR_ACCESSORS: the text's ``((recv) ___pyattr_x___)''."
	(self ___attrAccessorSelector___) ifNotNil: [:acc |
		^ aBuilder send: acc asSymbol to: recv with: #() env: 1].
	^ aBuilder
		send: #'___pyAttrLoad___:'
		to: recv
		with: { aBuilder obj: self ___mangledAttr___ asSymbol }
		env: 1
%

category: 'Grail-IR Codegen'
method: AttributeAst
___irSelfInferredSlotAccessor___
	"The accessor selector (``#___pyattr_x___'', a Symbol) when this is
	``self.x'' for one of the class's slots -- declared in __slots__, or
	inferred under GRAIL_INFERRED_SLOTS (CallAst classInferredSlotNames holds
	both) -- else nil.  The setter is the same spelling with a trailing colon.
	The caller has already established the self-receiver shape; CallAst's
	helper re-applies the text's guard."

	^ (CallAst ___inferredSlotAccessorFor___: value attr: self ___mangledAttr___)
		ifNotNil: [:acc | acc asSymbol]
%

category: 'Grail-IR Codegen'
method: AttributeAst
___irReadLocalNamesInto___: aSet locals: localSet
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self
%

category: 'Grail-IR Codegen'
method: AttributeAst
___irStampChild___
	^ value
%
