Python's LEGB hierarchy

Python has an LEGB hierarchy for name scoping (variables and functions/methods). In Grail, I'd like to map things to natural Smalltalk as much as possible for performance reasons and to make the generated code more understandable. 

Unfortunately Python has several semantic differences from Smalltalk. 
* Python has both functions (not part of a class) and methods (part of a class). 
* Python has variables and methods in the same namespace, and adding `()` to a variable reference "calls" the function stored in the variable. While it would be nice use both instance variables and instance methods in Smalltalk, we need some way to handle the cross-over (referencing a function name without parenthesis gives the "compiled method", while referencing a variable name with parenthesis "calls" the compiled method stored in the variable).
* Python has nested functions.
* "Local" names are quite easy to map to Smalltalk, they are parameters and locals (whether methods or blocks). 
* "Enclosing" names are a bit more complex because Smalltalk doesn't have nested functions. We need to think about this some more, but perhaps the name scoping will become clear as we consider how to implement nested functions.
* "Global" names need to be somewhere and since they are in a "module" it seems like a natural thing to have a class for each module and have the "globals" be instance variables in the class.
* "Built-in" names are part of the "builtins" module and should be visible to every module. One way to implement this would be to have "builtins" as a superclass for other "modules". This would allow built-in names to be visible, and methods could be called using `self`, but doesn't follow the Python model since there isn't a superclass/subclass relationship. It also doesn't allow a global to hide a built-in name (which I believe Python allows). Another idea would be to have builtins as a pool dictionary or as class variables