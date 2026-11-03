Extension { #name : 'PyClassMethodDescriptor' }

{ #category : 'Grail-Error Messages' }
PyClassMethodDescriptor class >> ___cannotPickleMessage [
	"A descriptor has no state to pickle or copy (Objects/typeobject.c,
	object_getstate_default)."

	^ 'cannot pickle ''classmethod_descriptor'' object'

]

{ #category : 'Grail-Error Messages' }
PyClassMethodDescriptor class >> ___getOfNoneForNoneMessage [
	"The slot wrapper's refusal of ``__get__(None, None)''
	(Objects/typeobject.c, wrap_descr_get)."

	^ '__get__(None, None) is invalid'

]

{ #category : 'Grail-Error Messages' }
PyClassMethodDescriptor class >> ___needsAnArgumentMessageFor: aName of: aTypeName [
	"Objects/descrobject.c:496, classmethoddescr_call."

	^ 'descriptor ''' @env0:, aName @env0:, ''' of ''' @env0:, aTypeName @env0:, ''' object needs an argument'

]

{ #category : 'Grail-Error Messages' }
PyClassMethodDescriptor class >> ___needsATypeMessageFor: aName of: aTypeName given: anObject [
	"Objects/descrobject.c:113, classmethod_get -- ``arg 2'' even when the
	descriptor was called, which passes the class there."

	^ 'descriptor ''' @env0:, aName @env0:, ''' for type ''' @env0:, aTypeName
		@env0:, ''' needs a type, not a ''' @env0:, (bytes ___pyTypeNameOf___: anObject) @env0:, ''' as arg 2'

]

{ #category : 'Grail-Error Messages' }
PyClassMethodDescriptor class >> ___requiresASubtypeMessageFor: aName of: aTypeName received: aClass [
	"Objects/descrobject.c:121, classmethod_get."

	^ 'descriptor ''' @env0:, aName @env0:, ''' requires a subtype of ''' @env0:, aTypeName
		@env0:, ''' but received ''' @env0:, (aClass @env1:__name__) @env0:asString @env0:, ''''

]

{ #category : 'Grail-Descriptor Protocol' }
PyClassMethodDescriptor >> ___boundTo: aClass [
	"This class method bound to aClass, refused unless aClass is the type or
	a subtype of it (classmethod_get)."

	| functions |
	aClass @env0:isBehavior ifFalse: [
		^ TypeError ___signal___: (self @env0:class
			___needsATypeMessageFor: self __name__ of: self ___typeName given: aClass)].
	functions := builtins @env1:instance.
	(functions @env1:issubclass: aClass _: type) ___isTruthy___ ifFalse: [
		^ TypeError ___signal___: (self @env0:class
			___requiresASubtypeMessageFor: self __name__ of: self ___typeName received: aClass)].
	^ MethodBinding instance: aClass callable: method

]

{ #category : 'Grail-Descriptor Protocol' }
PyClassMethodDescriptor >> ___call: positional kw: keywords [
	"descr(cls, *args, **kwargs) is descr.__get__(None, cls)(*args, **kwargs)
	(classmethoddescr_call)."

	| arguments |
	arguments := positional @env0:ifNil: [#()].
	arguments @env0:isEmpty ifTrue: [
		^ TypeError ___signal___: (self @env0:class ___needsAnArgumentMessageFor: self __name__ of: self ___typeName)].
	^ (self ___boundTo: (arguments @env0:at: 1))
		value: (arguments @env0:copyFrom: 2 to: arguments @env0:size)
		value: keywords

]

{ #category : 'Grail-Private' }
PyClassMethodDescriptor >> ___pyCallValue___: positional kw: kwargs [
	^ self ___call: positional kw: kwargs

]

{ #category : 'Grail-Private' }
PyClassMethodDescriptor >> ___typeName [
	"The name of the type this class method belongs to, as messages name it."

	^ (type @env1:__name__) @env0:asString

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __class__ [
	"types.ClassMethodDescriptorType, which CPython calls
	``classmethod_descriptor''."

	^ (BoundMethod ___callableTypeNamed___: 'classmethod_descriptor') @env0:ifNil: [self @env0:class]

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __doc__ [
	^ [method @env1:__doc__] @env0:on: AbstractException do: [:ex | ex @env0:return: None]

]

{ #category : 'Grail-Descriptor Protocol' }
PyClassMethodDescriptor >> __get__: anInstance [
	^ self __get__: anInstance _: None

]

{ #category : 'Grail-Descriptor Protocol' }
PyClassMethodDescriptor >> __get__: anInstance _: anOwner [
	"Bind to anOwner, or to anInstance's type when no owner is given; the
	instance itself is never bound (classmethod_get)."

	(anOwner == nil or: [anOwner == None]) ifFalse: [^ self ___boundTo: anOwner].
	(anInstance == nil or: [anInstance == None]) ifTrue: [
		^ TypeError ___signal___: self @env0:class ___getOfNoneForNoneMessage].
	^ self ___boundTo: (builtins @env1:instance @env1:type: anInstance)

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __name__ [
	^ method __name__

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __objclass__ [
	"The type whose class method this is."

	^ type

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __qualname__ [
	^ (self ___typeName @env0:, '.' @env0:, self __name__ @env0:asString) @env0:asUnicodeString

]

{ #category : 'Grail-Serialization' }
PyClassMethodDescriptor >> __reduce__ [
	^ TypeError ___signal___: self @env0:class ___cannotPickleMessage

]

{ #category : 'Grail-Serialization' }
PyClassMethodDescriptor >> __reduce_ex__: aProtocol [
	"Refused for every protocol, so pickle.dumps() and copy.copy() refuse
	it as CPython's do, where a class-like save_global was tried."

	^ self __reduce__

]

{ #category : 'Grail-Reflection' }
PyClassMethodDescriptor >> __repr__ [
	^ ('<method ''' @env0:, self __name__ @env0:asString @env0:, ''' of '''
		@env0:, self ___typeName @env0:, ''' objects>') @env0:asUnicodeString

]

{ #category : 'Grail-Private' }
PyClassMethodDescriptor >> value: positional value: keywords [
	^ self ___call: positional kw: keywords

]
