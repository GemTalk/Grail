Extension { #name : 'functools_partialmethod' }

{ #category : 'Grail-Reflection' }
functools_partialmethod class >> __module__ [
	^ 'functools'

]

{ #category : 'Grail-Reflection' }
functools_partialmethod class >> __qualname__ [
	^ 'partialmethod'

]

{ #category : 'Grail-Instantiation' }
functools_partialmethod class >> value: positional value: keywords [
	"partialmethod(fn, *args, **kw) -- the class-call entry.  Routes through
	the __new__ protocol so a subclass (whose ClassDefAst-emitted
	value:value: uses ___allocateInstance___) and a direct call share one
	constructor.  Without this the class-call handler looks for an __init__
	of matching arity and reports ``no matching method''."

	^ self ___allocateInstance___: positional kw: keywords

]

{ #category : 'Grail-Instantiation' }
functools_partialmethod >> ___new__: positional kw: keywords [
	"Constructor body.  self is the CLASS -- ___allocateInstance___ runs a
	class-body __new__ non-virtually with the class as receiver, which is
	also what makes ``class Sub(partialmethod): pass'' construct Sub
	instances (test_subclass_optimization; the old module function returned
	a closure, which cannot be subclassed at all)."

	| inst fn rest kw |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		"``partialmethod()'' and ``partialmethod(func=f, a=1)'' both land here:
		CPython takes func POSITIONALLY, so a keyword of that name is just
		another keyword and there is no function (test_invalid_args)."
		TypeError ___signal___:
			'partialmethod expected at least 1 argument, got 0'].
	fn := positional @env0:at: 1.
	"``partialmethod(None, 1)'' is a TypeError: the target has to be callable
	or a descriptor.  Checked at CONSTRUCTION, as CPython does, so the class
	body raises rather than something failing much later at call time."
	(((builtins @env0:___instance___) callable: fn)
		or: [(fn ___respondsTo___: #'__get__:_:')
			or: [fn ___respondsTo___: #'___get__:kw:']]) ifFalse: [
		TypeError ___signal___: (fn __repr__) @env0:asString
			@env0:, ' is not callable or a descriptor'].
	rest := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	kw := keywords == nil
		ifTrue: [KeyValueDictionary @env0:new]
		ifFalse: [keywords @env0:copy].
	"CPython flattens partialmethod-of-partialmethod: adopt the inner target,
	the INNER bound args come first, and the outer keywords override.  Grail's
	class body reads the sibling attribute for ``nested = partialmethod(
	positional, 5)'', so the inner really is one of these by then."
	(fn isKindOf: functools_partialmethod) ifTrue: [
		| merged |
		rest := (fn @env0:dynamicInstVarAt: #args) @env0:asArray @env0:, rest.
		merged := (fn @env0:dynamicInstVarAt: #keywords) @env0:copy.
		kw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
		kw := merged.
		fn := fn @env0:dynamicInstVarAt: #func].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #func put: fn.
	inst @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: rest).
	inst @env0:dynamicInstVarAt: #keywords put: kw.
	^ inst

]

{ #category : 'Grail-Attribute Access' }
functools_partialmethod >> ___pyBindsSelf___ [
	"Marker read by object >> ___isDescriptorCallable___:.  CPython makes
	this a descriptor whose __get__ binds the receiver; Grail reaches the
	same place through its own class-attribute binding, so ``a.m(5)'' arrives
	at the call below as (a, 5).

	NOT over a @staticmethod or @classmethod.  CPython's __get__ delegates to
	the wrapped descriptor's own, and neither binds the instance: a static one
	binds nothing at all, and a class one binds the CLASS.  Answering false
	sends those two down the __get__ route instead (see object >>
	___isValueDescriptor___:), which is the only way the CLASS-side read can
	work -- ``A.cls()'' passes no receiver, so there would be nothing for the
	call to recover the owner from."

	^ self ___wrappedKind___ == #plain

]

{ #category : 'Grail-Calling' }
functools_partialmethod >> ___pyCallValue___: positional kw: kwargs [
	"``a.m(*more, **moreKw)'' -> ``func(a, *bound, *more, **{**boundKw,
	**moreKw})''.

	One shape serves both access paths.  Read through an INSTANCE the
	receiver was prepended by the binding; read through the CLASS the caller
	passes it explicitly in the same leading slot (``A.m(a, 5)'').  Later
	keywords override the bound ones, as in CPython."

	| callArgs recv rest allKw fn kind bound |
	callArgs := positional @env0:ifNil: [#()].
	kind := self ___wrappedKind___.
	fn := self @env0:dynamicInstVarAt: #func.
	bound := (self @env0:dynamicInstVarAt: #args) @env0:asArray.
	allKw := (self @env0:dynamicInstVarAt: #keywords) @env0:copy.
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v | allKw @env0:at: k put: v]].
	"Over a @staticmethod there is no receiver in play at all, from either
	access path: ``A.static(5)'' and ``a.static(5)'' both call the wrapped
	function with just the bound args and the caller's own."
	kind == #static ifTrue: [
		^ (fn @env0:dynamicInstVarAt: #'__func__')
			___pyCallValue___: bound @env0:, callArgs kw: allKw].
	callArgs @env0:isEmpty ifTrue: [
		TypeError ___signal___: (self ___targetName___)
			@env0:, ' requires a receiver as its first argument'].
	recv := callArgs @env0:at: 1.
	rest := callArgs @env0:size @env0:> 1
		ifTrue: [callArgs @env0:copyFrom: 2 to: callArgs @env0:size]
		ifFalse: [#()].
	"Over a @classmethod the leading slot holds the CLASS, not the instance --
	__get__ put it there.  A caller reaching an instance in explicitly still
	gets the class, as CPython does."
	kind == #class ifTrue: [
		| owner |
		owner := (recv isKindOf: Behavior) ifTrue: [recv] ifFalse: [recv @env0:class].
		^ (fn @env0:dynamicInstVarAt: #'__func__')
			___pyCallValue___: ((Array @env0:with: owner) @env0:, bound @env0:, rest)
			kw: allKw].
	^ fn ___pyCallValue___: ((Array @env0:with: recv) @env0:, bound @env0:, rest)
		kw: allKw

]

{ #category : 'Grail-Single Dispatch' }
functools_partialmethod >> ___targetName___ [
	"The wrapped target's name, for the arity error."

	^ [(self @env0:dynamicInstVarAt: #func) __name__ @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: 'partialmethod']

]

{ #category : 'Grail-Private' }
functools_partialmethod >> ___wrappedKind___ [
	"#static, #class or #plain -- what this partialmethod wraps, which decides
	what (if anything) gets bound as the target's first argument.

	Only answerable now that staticmethod and classmethod are real wrapper
	objects; while both were identity stubs a partialmethod over either was
	indistinguishable from one over a plain function."

	| fn |
	fn := self @env0:dynamicInstVarAt: #func.
	(fn isKindOf: PyStaticMethod) ifTrue: [^ #static].
	(fn isKindOf: PyClassMethod) ifTrue: [^ #class].
	^ #plain

]

{ #category : 'Grail-Calling' }
functools_partialmethod >> __get__: obj [

	^ self __get__: obj _: None

]

{ #category : 'Grail-Calling' }
functools_partialmethod >> __get__: obj _: objtype [
	"The descriptor protocol.  Reached explicitly (``p.__get__(0)()'' in
	test_subclass_optimization), and -- for the @staticmethod and @classmethod
	kinds, which refuse the MethodBinding route -- by the ordinary attribute
	read as well, from BOTH the instance and the class side."

	| kind owner |
	kind := self ___wrappedKind___.
	"Nothing to bind: the call supplies everything."
	kind == #static ifTrue: [^ self].
	kind == #class ifTrue: [
		owner := (objtype == nil or: [objtype == None])
			ifTrue: [(obj == nil or: [obj == None])
				ifTrue: [nil]
				ifFalse: [obj @env0:class]]
			ifFalse: [objtype].
		owner == nil ifTrue: [
			TypeError ___signal___: (self ___targetName___)
				@env0:, ' over a classmethod needs an owner class to bind'].
		^ MethodBinding instance: owner callable: self].
	^ MethodBinding instance: obj callable: self

]

{ #category : 'Grail-Attribute Access' }
functools_partialmethod >> __isabstractmethod__ [
	"CPython: ``getattr(self.func, '__isabstractmethod__', False)'' -- so a
	partialmethod over an abstract method stays abstract, and one over an
	ordinary function reports False rather than raising.

	Asking the captured handle is not enough, and the reason is a handle
	asymmetry worth stating.  ``add5 = partialmethod(add, 5)'' in a class body
	captures a FORWARD REFERENCE: a BoundMethod whose receiver is nil, because
	the class does not exist yet.  ``@abc.abstractmethod'' on the def, by
	contrast, received the INTERNED UnboundMethod and stamped
	__isabstractmethod__ there -- which is why ``Cls.add'' reports true while the
	captured handle reports nothing.  Neither BoundMethod nor UnboundMethod
	defines __isabstractmethod__; it is purely a stored attribute, so the two
	handles simply disagree.

	So fall back to resolving the METHOD rather than the handle: the owner
	recorded by __set_name__ plus the handle's selector name the interned
	UnboundMethod the stamp actually landed on."

	| direct fn owner |
	direct := [((self @env0:dynamicInstVarAt: #func)
		___pyAttrLoad___: #'__isabstractmethod__') == true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false].
	direct ifTrue: [^ true].
	fn := self @env0:dynamicInstVarAt: #func.
	((fn @env0:isKindOf: BoundMethod) and: [fn @env0:receiver == nil])
		ifFalse: [^ false].
	owner := self @env0:dynamicInstVarAt: #'___owner___'.
	(owner @env0:notNil and: [owner @env0:isKindOf: Behavior]) ifFalse: [^ false].
	"definingClass:selector: is an env-1 constructor, so NO @env0: prefix here --
	an env-0 send DNUs.  It interns per (class, selector), which is the whole
	point: the interned instance is the one the decorator stamped."
	^ [((UnboundMethod definingClass: owner selector: fn @env0:selector)
		___pyAttrLoad___: #'__isabstractmethod__') == true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-Representation' }
functools_partialmethod >> __repr__ [
	"CPython: ``functools.partialmethod(<func>, 3, b=4)'' -- the target's
	repr, then the bound positionals, then the bound keywords in insertion
	order."

	| ws args kw first |
	ws := WriteStream @env0:on: Unicode7 @env0:new.
	ws @env0:nextPutAll: 'functools.partialmethod('.
	ws @env0:nextPutAll: ((self @env0:dynamicInstVarAt: #func) __repr__)
		@env0:asString.
	args := (self @env0:dynamicInstVarAt: #args) @env0:asArray.
	args @env0:do: [:a |
		ws @env0:nextPutAll: ', '.
		ws @env0:nextPutAll: (a __repr__) @env0:asString].
	kw := self @env0:dynamicInstVarAt: #keywords.
	first := true.
	kw @env0:keysAndValuesDo: [:k :v |
		ws @env0:nextPutAll: ', '.
		ws @env0:nextPutAll: k @env0:asString.
		ws @env0:nextPut: $=.
		ws @env0:nextPutAll: (v __repr__) @env0:asString.
		first := false].
	ws @env0:nextPut: $).
	^ ws @env0:contents

]

{ #category : 'Grail-Descriptor' }
functools_partialmethod >> __set_name__: owner _: aName [
	"Python's __set_name__, sent for every class-body entry as the class is
	built.  Recording the owner is what lets __isabstractmethod__ above resolve
	the method the forward-reference handle could not name."

	(owner @env0:isKindOf: Behavior) ifTrue: [
		self @env0:dynamicInstVarAt: #'___owner___' put: owner].
	^ ExecBlock @env0:___pyNone___

]

{ #category : 'Grail-Accessing' }
functools_partialmethod >> args [
	^ self @env0:dynamicInstVarAt: #args

]

{ #category : 'Grail-Accessing' }
functools_partialmethod >> func [
	^ self @env0:dynamicInstVarAt: #func

]

{ #category : 'Grail-Accessing' }
functools_partialmethod >> keywords [
	^ self @env0:dynamicInstVarAt: #keywords

]

{ #category : 'Grail-Calling' }
functools_partialmethod >> value: positional value: kwargs [
	"Called directly rather than through a binding."

	^ self ___pyCallValue___: positional kw: kwargs

]
