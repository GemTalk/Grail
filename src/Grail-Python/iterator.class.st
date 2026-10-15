"Python iterator base type.

An iterator is an object representing a stream of data. Repeated calls to the
iterator's __next__() method return successive items in the stream. When no
more data are available, a StopIteration exception is raised.

Iterators are required to have an __iter__() method that returns the iterator
object itself, so every iterator is also iterable.

This is the abstract base class for all Python iterators. Concrete iterator
types (list_iterator, tuple_iterator, etc.) inherit from this class.

"
Class {
	#name : 'iterator',
	#superclass : 'object',
	#category : 'Grail-Collections-Iterators'
}
