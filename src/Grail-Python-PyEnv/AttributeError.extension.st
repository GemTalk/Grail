Extension { #name : 'AttributeError' }

{ #category : 'Grail-Initialization' }
AttributeError class >> _new: positional kw: kwargs [
	"The class-call entry whenever KEYWORDS are present.  The generic class call
	(Object class >> value:value:) refuses keywords for a class that has no
	``_new:kw:'', which is right for BaseException and wrong here -- so this is
	what lets ``AttributeError('m', name=...)'' reach the keyword-aware
	___init__:kw: above instead of dying on ``takes no keyword arguments''."

	| instance |
	instance := (self ___classForArgs___: positional) ___new___.
	instance ___init__: positional kw: kwargs.
	^ instance

]

{ #category : 'Grail-Initialization' }
AttributeError >> ___init__: positional kw: kwargs [
	"CPython's AttributeError(*args, name=None, obj=None) -- see BaseException >>
	___init__:kw:keywords:displayName:.  BaseException itself takes no keywords,
	so without this ``AttributeError('m', name='x')'' was a TypeError."

	^ self ___init__: positional kw: kwargs keywords: #('name' 'obj') displayName: 'AttributeError'

]

{ #category : 'Grail-Accessors' }
AttributeError >> name [
	"CPython's ``name'' attribute, None until something stores one.  A stored value
	is a dynamic instVar of the same name, which attribute loads probe BEFORE
	the method chain, so this answers only when nothing was stored -- the
	positional construction paths (__new__: and friends) set ``args'' alone and
	never run an __init__ that could default it."

	^ (self @env0:dynamicInstVarAt: #'name') @env0:ifNil: [None]

]

{ #category : 'Grail-Accessors' }
AttributeError >> obj [
	"CPython's ``obj'' attribute, None until something stores one.  A stored value
	is a dynamic instVar of the same name, which attribute loads probe BEFORE
	the method chain, so this answers only when nothing was stored -- the
	positional construction paths (__new__: and friends) set ``args'' alone and
	never run an __init__ that could default it."

	^ (self @env0:dynamicInstVarAt: #'obj') @env0:ifNil: [None]

]
