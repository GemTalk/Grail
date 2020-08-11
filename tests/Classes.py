#!/usr/local/bin/python3
# https://docs.python.org/3.7/reference/compound_stmts.html#class-definitions

g = 'G'

class MyClass:
    iv1 = '1'

    def __init__(self, p):
        self.iv2 = p

    def foo(self, p):
        return 'MyClass>>foo(' + str(self) + ', ' + p + ') - ' + self.iv1 + ' - ' + self.iv2
        return 'foo'

    def bar1(self, p):
        return 'MyClass>>bar1(' + str(self) + ', ' + p + ')'

    bar2 = classmethod(bar1)

    @classmethod
    def bar3(cls, p):
        return 'MyClass>>bar3(' + str(cls) + ', ' + p + ')'

o = MyClass('A')
print(o.foo('B'))               # 1 - MyClass>>foo(<__main__.MyClass object at 0x7fb347a10438>, B) - 1 - A
print(o.bar1('B'))              # 2 - MyClass>>bar1(<__main__.MyClass object at 0x7fb347a10438>, B)
print(o.bar2('C'))              # 3 - MyClass>>bar1(<class '__main__.MyClass'>, C)
print(MyClass.bar1('C', 'D'))   # 4 - MyClass>>bar1(C, D)
print(MyClass.bar2('C'))        # 5 - MyClass>>bar1(<class '__main__.MyClass'>, C)
print(MyClass.bar3('C'))        # 6 - MyClass>>bar3(<class '__main__.MyClass'>, C)

def fun():
    print('fun', end=' ')
    class FunClass:
        cv = 1
        print('foo', end=' ')
        def __init__(self):
            pass

        def set(self, x):
            self.iv = x
        
        def get(self):
            return self.iv
    
    return FunClass

c1 = fun()
c2 = fun()
print(c1.cv, c2.cv, end=' ')
c1.cv = 2
c2.cv = 3
print(c1.cv, c2.cv, end=' ')
i11 = c1()
i12 = c1()
i11.set(4)
i12.set(5)
print(i11.get(), i12.get())     # 7 - fun foo fun foo 1 1 2 3 4 5
