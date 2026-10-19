"One rich comparison synthesised by ``@functools.total_ordering' —
the Grail stand-in for CPython's twelve module-level ``_le_from_lt'
/ ``_gt_from_ge' / ... helper FUNCTIONS.

CPython's total_ordering does ``setattr(cls, opname, opfunc)' with a
plain function, which the descriptor protocol binds on instance access.
Grail has no way to mint a Python function from Smalltalk, so each
synthesised operator is an instance of this class instead, carrying the
pair it was derived from:

  * root    — the comparison the decorated class defines itself
              (#'__lt__' / #'__le__' / #'__gt__' / #'__ge__')
  * derived — the comparison this object implements

It answers ``___pyBindsSelf___', the marker that makes
``object >> ___isDescriptorCallable___:' treat it as a function for
descriptor binding — so ``a <= b' and an explicit ``a.__le__(b)' both
reach it with ``self' prepended, exactly as a def would."
Class {
	#name : 'functools_ordering_op',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
functools_ordering_op class >> ___pythonValueAttrs___ [
	"``__name__'' is a name STRING, not a callable.  Without this hook
	___pyAttrLoad___ reaches its BoundMethod wrap and ``A.__ge__.__name__''
	answers a callable around the accessor instead of ``'__ge__'''."

	^ IdentitySet new
		add: #'__name__';
		yourself

]
