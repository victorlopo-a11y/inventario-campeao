-- Fix check_low_stock function to use valid role 'programador' instead of 'editor'
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.available_quantity <= 5 AND (OLD.available_quantity IS NULL OR OLD.available_quantity > 5) THEN
    INSERT INTO public.notifications (equipment_id, message, sent_to_role)
    VALUES (
      NEW.id,
      'Estoque baixo: ' || NEW.name || ' tem apenas ' || NEW.available_quantity || ' unidades disponíveis',
      'programador'
    );
  END IF;
  RETURN NEW;
END;
$function$;