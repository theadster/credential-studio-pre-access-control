import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../accordion';

describe('Accordion Component', () => {
  it('renders accordion with items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Trigger 1</AccordionTrigger>
          <AccordionContent>Test Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Test Trigger 2</AccordionTrigger>
          <AccordionContent>Test Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // Verify triggers are rendered
    expect(screen.getByText('Test Trigger 1')).toBeInTheDocument();
    expect(screen.getByText('Test Trigger 2')).toBeInTheDocument();
  });

  it('renders accordion content', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content is visible</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // Content should be visible when defaultValue is set
    expect(screen.getByText('Content is visible')).toBeInTheDocument();
  });

  it('renders multiple accordion items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // All triggers should be present
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies custom className to AccordionItem', () => {
    const { container } = render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="custom-class">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const accordionItem = container.querySelector('.custom-class');
    expect(accordionItem).toBeInTheDocument();
  });

  it('applies custom className to AccordionContent', () => {
    const { container } = render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent className="custom-content">
            Content
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const contentWrapper = container.querySelector('.custom-content');
    expect(contentWrapper).toBeInTheDocument();
  });
});
