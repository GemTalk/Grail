Extension { #name : 'ImportError' }

{ #category : 'Grail-Initialization' }
ImportError class >> _new: positional kw: kwargs [
	"The class-call entry whenever KEYWORDS are present.  The generic class call
	(Object class >> value:value:) refuses keywords for a class that has no
	``_new:kw:'', which is right for BaseException and wrong here -- so this is
	what lets ``ImportError('m', name=...)'' reach the keyword-aware
	___init__:kw: above instead of dying on ``takes no keyword arguments''."

	| instance |
	instance := (self ___classForArgs___: positional) ___new___.
	instance ___init__: positional kw: kwargs.
	^ instance

]

{ #category : 'Grail-Import Errors' }
ImportError >> ___args___: anArray [
	"Also publish CPython's ``msg'' attribute, which every ImportError has.

	CPython's ImportError_init sets ``msg'' to the single positional argument
	when there is exactly one, and leaves it None otherwise -- so ``e.msg'' is
	ALWAYS readable on an ImportError, and real code reads it.  numpy's
	_core/__init__.py opens its ImportError handler with

	    if exc.msg == ''cannot load module more than once per process'':

	which under Grail raised ``AttributeError: 'ImportError' object has no
	attribute 'msg''' -- a second, quieter failure hiding behind the first, and
	only visible once a failed dlopen stopped killing the session outright.

	Done in ___args___: rather than in one constructor so it holds for EVERY
	path that builds an ImportError or a subclass of it (ModuleNotFoundError
	included), not just the two class-side signallers in this file."

	super ___args___: anArray.
	self @env0:___setMsgFrom___: anArray

]

{ #category : 'Grail-Initialization' }
ImportError >> ___init__: positional kw: kwargs [
	"CPython's ImportError(*args, name=None, path=None, name_from=None) -- see BaseException >>
	___init__:kw:keywords:displayName:.  BaseException itself takes no keywords,
	so without this ``ImportError('m', name='x')'' was a TypeError."

	^ self ___init__: positional kw: kwargs keywords: #('name' 'path' 'name_from') displayName: 'ImportError'

]

{ #category : 'Grail-Accessors' }
ImportError >> name [
	"CPython's ``name'' attribute, None until something stores one.  A stored value
	is a dynamic instVar of the same name, which attribute loads probe BEFORE
	the method chain, so this answers only when nothing was stored -- the
	positional construction paths (__new__: and friends) set ``args'' alone and
	never run an __init__ that could default it."

	^ (self @env0:dynamicInstVarAt: #'name') @env0:ifNil: [None]

]

{ #category : 'Grail-Accessors' }
ImportError >> name_from [
	"CPython's ``name_from'' attribute, None until something stores one.  A stored value
	is a dynamic instVar of the same name, which attribute loads probe BEFORE
	the method chain, so this answers only when nothing was stored -- the
	positional construction paths (__new__: and friends) set ``args'' alone and
	never run an __init__ that could default it."

	^ (self @env0:dynamicInstVarAt: #'name_from') @env0:ifNil: [None]

]

{ #category : 'Grail-Accessors' }
ImportError >> path [
	"CPython's ``path'' attribute, None until something stores one.  A stored value
	is a dynamic instVar of the same name, which attribute loads probe BEFORE
	the method chain, so this answers only when nothing was stored -- the
	positional construction paths (__new__: and friends) set ``args'' alone and
	never run an __init__ that could default it."

	^ (self @env0:dynamicInstVarAt: #'path') @env0:ifNil: [None]

]
