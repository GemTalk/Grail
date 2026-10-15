"Python descriptor-protocol bound method.  When a callable (a
function, BoundMethod, lambda block) is stored on a class and then
read through an INSTANCE, Python returns a bound method that
prepends the instance to the call's positional arguments and
forwards to the underlying callable.

    class C: pass
    def greet(self, name): return self.x, name
    C.greet = greet
    c = C(); c.x = 7
    c.greet('hi')             # → (7, 'hi') — self prepended

Reading the same attribute through the CLASS (``C.greet') returns
the function unchanged.  Storing on the INSTANCE
(``c.method = func') skips the descriptor protocol entirely and
``c.method(2)' calls func(2) directly with no self prepend.

This is distinct from BoundMethod: BoundMethod = (receiver,
selector) — when called, dispatches the selector to the receiver.
MethodBinding = (instance, callable) — when called, prepends
instance to args and forwards to the inner callable.  The wrap is
applied by ___pyAttrLoad___ when a callable is found in a class's
___dynInstVars___ (NOT the instance's own ___dynInstVars___ — that path
bypasses descriptors)."
Class {
	#name : 'MethodBinding',
	#superclass : 'Object',
	#instVars : [
		'instance',
		'callable'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
MethodBinding class >> ___pythonValueAttrs___ [
	"``__self__'' / ``__func__'' are the bound receiver and function, values
	rather than callables; without this the attribute read wraps the accessor
	in a BoundMethod and ``m.__self__ is obj'' compares the wrapper."

	^ IdentitySet new
		add: #'__self__';
		add: #'__func__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__doc__';
		add: #'__annotations__';
		add: #'__defaults__';
		add: #'__kwdefaults__';
		yourself

]

{ #category : 'Grail-Private' }
MethodBinding >> _setInstance: anObject callable: aCallable [
	instance := anObject.
	callable := aCallable.

]

{ #category : 'Grail-Accessing' }
MethodBinding >> callable [
	^ callable

]

{ #category : 'Grail-Accessing' }
MethodBinding >> instance [
	^ instance

]
