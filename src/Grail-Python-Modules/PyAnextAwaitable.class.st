Class {
	#name : 'PyAnextAwaitable',
	#superclass : 'Object',
	#instVars : [
		'ait',
		'defaultValue',
		'inner',
		'anextResult',
		'bareGenOk'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyAnextAwaitable class >> ___on___: anAsyncIterator default: aDefault [
	| inst |
	inst := self new.
	inst ___setAit___: anAsyncIterator default: aDefault.
	^ inst

]

{ #category : 'Grail-Private' }
PyAnextAwaitable >> ___setAit___: anAsyncIterator default: aDefault [
	"__anext__ is called EAGERLY, at anext() time -- CPython does, and
	test_sync_anext_raises_exception depends on it: an __anext__ that raises
	SYNCHRONOUSLY (StopAsyncIteration included) must surface from the
	anext(ait, default) CALL, not from a later drive.  Only the CALL is
	eager; nothing drives the result until the caller does."

	ait := anAsyncIterator.
	defaultValue := aDefault.
	"CPython tells a @types.coroutine __anext__ from a bare generator one by
	the CO_ITERABLE_COROUTINE flag; Grail's decorator marks EACH RESULT
	GENERATOR through a wrapper (types.py explains why the function-object
	stamp alone was identity-fragile: for a class defined inside a METHOD,
	the object the decorator stamps is not the object a later attribute read
	retrieves -- measured), so the mark is read off the result: a dynamic
	instVar, immune to how the method was retrieved."
	"THROUGH THE ATTRIBUTE PATH, not a bare ``@env1:__anext__'' send: a
	decorated __anext__'s wrapper lives in the class dict, and the direct
	selector send dispatches to the compiled RAW method underneath it -- the
	same bypass DecoratedMethodSelfCallTestCase records for self-sends.
	Here it silently stripped @types.coroutine's result mark, so the
	acceptance test rejected exactly the shape it exists to accept."
	anextResult := (ait @env1:___pyAttrLoad___: #'__anext__')
		@env1:___pyCallValue___: { } kw: nil.
	bareGenOk := [(anextResult @env0:dynamicInstVarAt: #'_grail_iterable_coroutine') == True]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]

]
