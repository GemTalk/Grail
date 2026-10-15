"Callable shim returned from ``super().method`` access.

Holds:
  * obj      — the instance/class to substitute as the receiver
  * resolver — a block ``[:nargs :kwOk | <GsNMethod or nil>]`` that
               picks the right arity selector at call time and
               looks it up on the parent class chain.
  * selector — the requested attribute symbol (for error messages).

Dispatches by sending ``GsNMethod >> _executeInContext:`` with an
Array of (receiver, args...).  If the resolver finds no matching
parent method, raises AttributeError."
Class {
	#name : 'SuperBoundMethod',
	#superclass : 'Object',
	#instVars : [
		'obj',
		'resolver',
		'selector'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
SuperBoundMethod >> _obj [
	"env-0, like _setObj:resolver:selector: above -- __eq__ reaches these with
	@env0: sends, and compiling them under env 1 (which the surrounding section
	selects) left them unreachable from there: ``a SuperBoundMethod does not
	understand #'_obj''', escaping as an uncatchable Smalltalk error rather than
	a Python one."

	^ obj

]

{ #category : 'Grail-Private' }
SuperBoundMethod >> _selector [
	^ selector

]

{ #category : 'Grail-Private' }
SuperBoundMethod >> _setObj: anObj resolver: aResolver selector: aSym [

	obj := anObj.
	resolver := aResolver.
	selector := aSym.

]
