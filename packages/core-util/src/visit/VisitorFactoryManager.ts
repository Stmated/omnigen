
export class VisitorFactoryManager {

  public static create<V>(base: V, also: Partial<V>): V {

    // TODO: Need to figure out a way to cache these, so we do not create new ones over and over.
    //        But if we use this central one we can change the signature later and update everywhere.
    return {
      ...base,
      ...also,
    };
  }
}
