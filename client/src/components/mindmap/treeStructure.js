export function splitNodeChildren(node) {
  const children = node.children || [];
  const mainChild = children.find(child => child.branchType !== 'quote') || null;
  return { mainChild, branchChildren: children.filter(child => child !== mainChild) };
}
