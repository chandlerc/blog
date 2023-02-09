class MyType {
  void PrivateByDefault();

public:
  void MarkedAsPublic();
};

struct MyOtherType {
  void PublicByDefault();

private:
  void MarkedAsPrivate();
};
